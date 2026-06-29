import { ConflictException, Injectable } from '@nestjs/common';
import {
  InventoryMovementType,
  InventoryReservationStatus,
  Prisma,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';

type ClaimedReservationRow = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  referenceId: string | null;
  expiresAt: Date;
};

type InventoryBalanceRow = {
  id: string;
  warehouseId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpireDueReservationsInput = {
  now: Date;
  batchSize: number;
};

export type ExpireDueReservationsResult = {
  claimed: number;
  expired: number;
  reservationIds: string[];
};

@Injectable()
export class InventoryReservationExpirationService {
  constructor(private readonly prisma: PrismaService) {}

  async expireDueBatch(
    input: ExpireDueReservationsInput,
  ): Promise<ExpireDueReservationsResult> {
    const batchSize = this.normalizeBatchSize(input.batchSize);

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Các row được claim và giữ lock cho đến khi
         * transaction commit hoặc rollback.
         *
         * Worker khác dùng SKIP LOCKED nên sẽ bỏ qua
         * các reservation đang được worker này xử lý.
         */
        const claimedReservations = await tx.$queryRaw<ClaimedReservationRow[]>`
            SELECT
              r."id",
              r."inventory_item_id"
                AS "inventoryItemId",
              r."quantity",
              r."reference_id"
                AS "referenceId",
              r."expires_at"
                AS "expiresAt"

            FROM "inventory_reservations" r

            WHERE
              r."status" =
                'ACTIVE'::"InventoryReservationStatus"

              AND r."expires_at" <=
                ${input.now}

            ORDER BY
              r."expires_at" ASC,
              r."id" ASC

            LIMIT ${batchSize}

            FOR UPDATE OF r
            SKIP LOCKED
          `;

        /*
         * Sắp xếp lại theo inventoryItemId trước khi
         * update inventory item.
         *
         * Nhiều worker sẽ lấy inventory row lock theo
         * cùng thứ tự, giảm nguy cơ deadlock khi một
         * batch chứa reservation của nhiều inventory item.
         */
        const processingOrder = [...claimedReservations].sort((left, right) => {
          const itemComparison = left.inventoryItemId.localeCompare(
            right.inventoryItemId,
          );

          if (itemComparison !== 0) {
            return itemComparison;
          }

          const expirationComparison =
            left.expiresAt.getTime() - right.expiresAt.getTime();

          if (expirationComparison !== 0) {
            return expirationComparison;
          }

          return left.id.localeCompare(right.id);
        });

        const expiredIds: string[] = [];

        for (const reservation of processingOrder) {
          const inventory = await this.releaseReservedBalance(tx, reservation);

          const transition = await tx.inventoryReservation.updateMany({
            where: {
              id: reservation.id,

              status: InventoryReservationStatus.ACTIVE,

              expiresAt: {
                lte: input.now,
              },
            },

            data: {
              status: InventoryReservationStatus.EXPIRED,

              expiredAt: input.now,
            },
          });

          if (transition.count !== 1) {
            throw new ConflictException({
              code: 'INVENTORY_RESERVATION_EXPIRATION_CONFLICT',

              message: 'Reservation could not be transitioned to expired',
            });
          }

          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: reservation.inventoryItemId,

              reservationId: reservation.id,

              type: InventoryMovementType.RESERVATION_EXPIRED,

              deltaOnHand: 0,

              deltaReserved: -reservation.quantity,

              balanceOnHandAfter: inventory.onHand,

              balanceReservedAfter: inventory.reserved,

              referenceId: reservation.referenceId,
            },
          });

          expiredIds.push(reservation.id);
        }

        return {
          claimed: claimedReservations.length,

          expired: expiredIds.length,

          reservationIds: expiredIds,
        };
      },
      {
        /*
         * SKIP LOCKED được sử dụng như queue claiming.
         * Không cần Serializable cho worker này.
         */
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,

        maxWait: 5_000,
        timeout: 30_000,
      },
    );
  }

  private async releaseReservedBalance(
    tx: Prisma.TransactionClient,
    reservation: {
      inventoryItemId: string;
      quantity: number;
    },
  ): Promise<InventoryBalanceRow> {
    const rows = await tx.$queryRaw<InventoryBalanceRow[]>`
        UPDATE "inventory_items"

        SET
          "reserved" =
            "reserved" -
            ${reservation.quantity},

          "version" =
            "version" + 1,

          "updated_at" = NOW()

        WHERE
          "id" =
            ${reservation.inventoryItemId}::uuid

          AND "reserved" >=
            ${reservation.quantity}

        RETURNING
          "id",

          "warehouse_id"
            AS "warehouseId",

          "variant_id"
            AS "variantId",

          "on_hand"
            AS "onHand",

          "reserved",

          (
            "on_hand" -
            "reserved"
          ) AS "available",

          "version",

          "created_at"
            AS "createdAt",

          "updated_at"
            AS "updatedAt"
      `;

    const inventory = rows[0];

    if (!inventory) {
      /*
       * Không bỏ qua reservation lỗi vì như vậy status
       * ACTIVE sẽ không còn phản ánh balance chính xác.
       *
       * Rollback toàn bộ batch và phát cảnh báo để
       * điều tra dữ liệu bị lệch.
       */
      throw new ConflictException({
        code: 'INVENTORY_BALANCE_CORRUPTED',

        message:
          'Reserved inventory could not be released for an expired reservation',

        details: {
          inventoryItemId: reservation.inventoryItemId,

          reservationQuantity: reservation.quantity,
        },
      });
    }

    return inventory;
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize)) {
      return 100;
    }

    return Math.min(500, Math.max(1, batchSize));
  }
}
