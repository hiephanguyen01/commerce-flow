import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  InventoryMovementType,
  InventoryReservationStatus,
  Prisma,
  ProductVariantStatus,
  WarehouseStatus,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto.js';
import { ReceiveStockDto } from '../dto/receive-stock.dto.js';
import { ReserveStockDto } from '../dto/reserve-stock.dto.js';

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

type ReservationTransition =
  | typeof InventoryReservationStatus.RELEASED
  | typeof InventoryReservationStatus.COMMITTED
  | typeof InventoryReservationStatus.EXPIRED;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createWarehouse(dto: CreateWarehouseDto) {
    try {
      return await this.prisma.warehouse.create({
        data: {
          code: dto.code.trim().toUpperCase(),

          name: dto.name.trim(),
        },

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      this.rethrowInventoryError(error);
    }
  }

  async findAvailability(warehouseId: string, variantId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId,
          variantId,
        },
      },

      select: {
        id: true,
        warehouseId: true,
        variantId: true,
        onHand: true,
        reserved: true,
        version: true,
        updatedAt: true,

        warehouse: {
          select: {
            code: true,
            name: true,
            status: true,
          },
        },

        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
          },
        },
      },
    });

    if (!item) {
      return {
        warehouseId,
        variantId,
        onHand: 0,
        reserved: 0,
        available: 0,
        version: null,
      };
    }

    return {
      ...item,
      available: item.onHand - item.reserved,
    };
  }

  async receiveStock(dto: ReceiveStockDto) {
    try {
      return await this.executeSerializable(async (tx) => {
        const existingMovement = await tx.inventoryMovement.findUnique({
          where: {
            idempotencyKey: dto.idempotencyKey,
          },

          select: this.getMovementSelect(),
        });

        if (existingMovement) {
          this.assertReceiveIdempotency(existingMovement, dto);

          return {
            movement: existingMovement,

            inventory: {
              id: existingMovement.inventoryItem.id,

              warehouseId: existingMovement.inventoryItem.warehouseId,

              variantId: existingMovement.inventoryItem.variantId,

              onHand: existingMovement.balanceOnHandAfter,

              reserved: existingMovement.balanceReservedAfter,

              available:
                existingMovement.balanceOnHandAfter -
                existingMovement.balanceReservedAfter,

              version: existingMovement.inventoryItem.version,
            },

            idempotentReplay: true,
          };
        }

        await this.ensureWarehouseIsActive(tx, dto.warehouseId);

        await this.ensureVariantExists(tx, dto.variantId);

        const generatedId = randomUUID();

        const rows = await tx.$queryRaw<InventoryBalanceRow[]>`
              INSERT INTO "inventory_items" (
                "id",
                "warehouse_id",
                "variant_id",
                "on_hand",
                "reserved",
                "version",
                "created_at",
                "updated_at"
              )
              VALUES (
                ${generatedId}::uuid,
                ${dto.warehouseId}::uuid,
                ${dto.variantId}::uuid,
                ${dto.quantity},
                0,
                1,
                NOW(),
                NOW()
              )
              ON CONFLICT (
                "warehouse_id",
                "variant_id"
              )
              DO UPDATE SET
                "on_hand" =
                  "inventory_items"."on_hand"
                  + ${dto.quantity},

                "version" =
                  "inventory_items"."version"
                  + 1,

                "updated_at" = NOW()

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
          throw new ConflictException({
            code: 'INVENTORY_RECEIVE_FAILED',

            message: 'Inventory could not be updated',
          });
        }

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventory.id,

            type: InventoryMovementType.STOCK_RECEIVED,

            deltaOnHand: dto.quantity,

            deltaReserved: 0,

            balanceOnHandAfter: inventory.onHand,

            balanceReservedAfter: inventory.reserved,

            idempotencyKey: dto.idempotencyKey,

            referenceId: this.normalizeOptionalText(dto.referenceId),

            note: this.normalizeOptionalText(dto.note),
          },

          select: this.getMovementSelect(),
        });

        return {
          inventory,
          movement,
          idempotentReplay: false,
        };
      });
    } catch (error) {
      /*
       * Hai request có cùng idempotencyKey có thể
       * cùng vượt qua bước findUnique. Unique
       * constraint sẽ rollback một transaction.
       */
      if (this.isUniqueError(error)) {
        const existing = await this.prisma.inventoryMovement.findUnique({
          where: {
            idempotencyKey: dto.idempotencyKey,
          },

          select: this.getMovementSelect(),
        });

        if (existing) {
          this.assertReceiveIdempotency(existing, dto);

          return {
            movement: existing,

            inventory: {
              id: existing.inventoryItem.id,

              warehouseId: existing.inventoryItem.warehouseId,

              variantId: existing.inventoryItem.variantId,

              onHand: existing.balanceOnHandAfter,

              reserved: existing.balanceReservedAfter,

              available:
                existing.balanceOnHandAfter - existing.balanceReservedAfter,

              version: existing.inventoryItem.version,
            },

            idempotentReplay: true,
          };
        }
      }

      this.rethrowInventoryError(error);
    }
  }

  async reserveStock(dto: ReserveStockDto) {
    try {
      return await this.executeSerializable(async (tx) => {
        const existing = await tx.inventoryReservation.findUnique({
          where: {
            idempotencyKey: dto.idempotencyKey,
          },

          select: this.getReservationSelect(),
        });

        if (existing) {
          this.assertReservationIdempotency(existing, dto);

          return {
            reservation: existing,

            inventory: this.toInventoryBalance(existing.inventoryItem),

            idempotentReplay: true,
          };
        }

        const item = await tx.inventoryItem.findUnique({
          where: {
            warehouseId_variantId: {
              warehouseId: dto.warehouseId,

              variantId: dto.variantId,
            },
          },

          select: {
            id: true,

            warehouse: {
              select: {
                status: true,
              },
            },

            variant: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!item) {
          throw new UnprocessableEntityException({
            code: 'INVENTORY_ITEM_NOT_FOUND',

            message:
              'Inventory has not been initialized for this variant and warehouse',
          });
        }

        if (item.warehouse.status !== WarehouseStatus.ACTIVE) {
          throw new ConflictException({
            code: 'WAREHOUSE_NOT_ACTIVE',

            message: 'Stock cannot be reserved from an inactive warehouse',
          });
        }

        if (item.variant.status !== ProductVariantStatus.ACTIVE) {
          throw new ConflictException({
            code: 'VARIANT_NOT_ACTIVE',

            message: 'Stock cannot be reserved for an inactive variant',
          });
        }

        /*
         * Đây là thao tác chống overselling.
         *
         * Điều kiện available >= quantity và việc
         * tăng reserved nằm trong cùng một SQL
         * statement.
         */
        const rows = await tx.$queryRaw<InventoryBalanceRow[]>`
              UPDATE "inventory_items"
              SET
                "reserved" =
                  "reserved"
                  + ${dto.quantity},

                "version" =
                  "version" + 1,

                "updated_at" = NOW()

              WHERE
                "id" = ${item.id}::uuid

                AND (
                  "on_hand" -
                  "reserved"
                ) >= ${dto.quantity}

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
          const current = await tx.inventoryItem.findUnique({
            where: {
              id: item.id,
            },

            select: {
              onHand: true,
              reserved: true,
            },
          });

          throw new ConflictException({
            code: 'INSUFFICIENT_AVAILABLE_STOCK',

            message: 'Available stock is insufficient',

            details: {
              requested: dto.quantity,

              available: current ? current.onHand - current.reserved : 0,
            },
          });
        }

        const expiresAt = new Date(Date.now() + dto.ttlSeconds * 1000);

        const reservation = await tx.inventoryReservation.create({
          data: {
            inventoryItemId: inventory.id,

            quantity: dto.quantity,

            idempotencyKey: dto.idempotencyKey,

            referenceId: this.normalizeOptionalText(dto.referenceId),

            expiresAt,
          },

          select: this.getReservationSelect(),
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventory.id,

            reservationId: reservation.id,

            type: InventoryMovementType.RESERVATION_CREATED,

            deltaOnHand: 0,

            deltaReserved: dto.quantity,

            balanceOnHandAfter: inventory.onHand,

            balanceReservedAfter: inventory.reserved,

            referenceId: this.normalizeOptionalText(dto.referenceId),
          },
        });

        return {
          reservation,
          inventory,
          idempotentReplay: false,
        };
      });
    } catch (error) {
      if (this.isUniqueError(error)) {
        const existing = await this.prisma.inventoryReservation.findUnique({
          where: {
            idempotencyKey: dto.idempotencyKey,
          },

          select: this.getReservationSelect(),
        });

        if (existing) {
          this.assertReservationIdempotency(existing, dto);

          return {
            reservation: existing,

            inventory: this.toInventoryBalance(existing.inventoryItem),

            idempotentReplay: true,
          };
        }
      }

      this.rethrowInventoryError(error);
    }
  }

  async releaseReservation(reservationId: string) {
    return this.transitionReservation(
      reservationId,
      InventoryReservationStatus.RELEASED,
    );
  }

  async commitReservation(reservationId: string) {
    return this.transitionReservation(
      reservationId,
      InventoryReservationStatus.COMMITTED,
    );
  }

  async expireReservation(reservationId: string, now = new Date()) {
    return this.transitionReservation(
      reservationId,
      InventoryReservationStatus.EXPIRED,
      now,
    );
  }

  private async transitionReservation(
    reservationId: string,
    targetStatus: ReservationTransition,
    transitionedAt = new Date(),
  ) {
    try {
      return await this.executeSerializable(async (tx) => {
        const reservation = await tx.inventoryReservation.findUnique({
          where: {
            id: reservationId,
          },

          select: this.getReservationSelect(),
        });

        if (!reservation) {
          throw new NotFoundException({
            code: 'INVENTORY_RESERVATION_NOT_FOUND',

            message: 'Inventory reservation was not found',
          });
        }

        /*
         * Retry cùng action không thay đổi balance lần hai.
         */
        if (reservation.status === targetStatus) {
          return {
            reservation,
            inventory: this.toInventoryBalance(reservation.inventoryItem),
            idempotentReplay: true,
          };
        }

        if (reservation.status !== InventoryReservationStatus.ACTIVE) {
          throw new ConflictException({
            code: 'INVENTORY_RESERVATION_ALREADY_FINALIZED',

            message: `Reservation is already ${reservation.status.toLowerCase()}`,
          });
        }

        if (
          targetStatus === InventoryReservationStatus.EXPIRED &&
          reservation.expiresAt > transitionedAt
        ) {
          throw new ConflictException({
            code: 'INVENTORY_RESERVATION_NOT_EXPIRED',

            message: 'Reservation has not expired yet',
          });
        }

        const transitionData: Prisma.InventoryReservationUpdateManyMutationInput =
          {
            status: targetStatus,

            ...(targetStatus === InventoryReservationStatus.RELEASED
              ? {
                  releasedAt: transitionedAt,
                }
              : {}),

            ...(targetStatus === InventoryReservationStatus.COMMITTED
              ? {
                  committedAt: transitionedAt,
                }
              : {}),

            ...(targetStatus === InventoryReservationStatus.EXPIRED
              ? {
                  expiredAt: transitionedAt,
                }
              : {}),
          };

        /*
         * Chỉ một concurrent request được quyền
         * chuyển ACTIVE sang final state.
         */
        const transition = await tx.inventoryReservation.updateMany({
          where: {
            id: reservationId,

            status: InventoryReservationStatus.ACTIVE,
          },

          data: transitionData,
        });

        if (transition.count !== 1) {
          throw new ConflictException({
            code: 'INVENTORY_RESERVATION_CONCURRENT_TRANSITION',

            message: 'Reservation was finalized by another request',
          });
        }

        const inventory =
          targetStatus === InventoryReservationStatus.COMMITTED
            ? await this.commitInventoryBalance(tx, reservation)
            : await this.releaseInventoryBalance(tx, reservation);

        const movementType = this.getTransitionMovementType(targetStatus);

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: reservation.inventoryItemId,

            reservationId: reservation.id,

            type: movementType,

            deltaOnHand:
              targetStatus === InventoryReservationStatus.COMMITTED
                ? -reservation.quantity
                : 0,

            deltaReserved: -reservation.quantity,

            balanceOnHandAfter: inventory.onHand,

            balanceReservedAfter: inventory.reserved,

            referenceId: reservation.referenceId,
          },
        });

        const updatedReservation =
          await tx.inventoryReservation.findUniqueOrThrow({
            where: {
              id: reservation.id,
            },

            select: this.getReservationSelect(),
          });

        return {
          reservation: updatedReservation,

          inventory,
          idempotentReplay: false,
        };
      });
    } catch (error) {
      this.rethrowInventoryError(error);
    }
  }

  private async commitInventoryBalance(
    tx: Prisma.TransactionClient,
    reservation: {
      inventoryItemId: string;
      quantity: number;
    },
  ): Promise<InventoryBalanceRow> {
    const rows = await tx.$queryRaw<InventoryBalanceRow[]>`
        UPDATE "inventory_items"
        SET
          "on_hand" =
            "on_hand" -
            ${reservation.quantity},

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

          AND "on_hand" >=
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
      throw new ConflictException({
        code: 'INVENTORY_BALANCE_CORRUPTED',

        message: 'Reserved inventory could not be committed',
      });
    }

    return inventory;
  }

  private async releaseInventoryBalance(
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
      throw new ConflictException({
        code: 'INVENTORY_BALANCE_CORRUPTED',

        message: 'Reserved inventory could not be released',
      });
    }

    return inventory;
  }

  private async executeSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maximumAttempts = 3;

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,

          maxWait: 5_000,
          timeout: 10_000,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (!retryable || attempt === maximumAttempts) {
          throw error;
        }

        await this.sleep(20 * attempt + Math.floor(Math.random() * 30));
      }
    }

    throw new ConflictException({
      code: 'INVENTORY_TRANSACTION_FAILED',

      message: 'Inventory transaction could not be completed',
    });
  }

  private async ensureWarehouseIsActive(
    tx: Prisma.TransactionClient,
    warehouseId: string,
  ): Promise<void> {
    const warehouse = await tx.warehouse.findUnique({
      where: {
        id: warehouseId,
      },

      select: {
        status: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',

        message: 'Warehouse was not found',
      });
    }

    if (warehouse.status !== WarehouseStatus.ACTIVE) {
      throw new ConflictException({
        code: 'WAREHOUSE_NOT_ACTIVE',

        message: 'Warehouse is not active',
      });
    }
  }

  private async ensureVariantExists(
    tx: Prisma.TransactionClient,
    variantId: string,
  ): Promise<void> {
    const variant = await tx.productVariant.findUnique({
      where: {
        id: variantId,
      },

      select: {
        id: true,
      },
    });

    if (!variant) {
      throw new NotFoundException({
        code: 'PRODUCT_VARIANT_NOT_FOUND',

        message: 'Product variant was not found',
      });
    }
  }

  private assertReceiveIdempotency(
    movement: {
      deltaOnHand: number;

      inventoryItem: {
        warehouseId: string;
        variantId: string;
      };
    },
    dto: ReceiveStockDto,
  ): void {
    const sameRequest =
      movement.deltaOnHand === dto.quantity &&
      movement.inventoryItem.warehouseId === dto.warehouseId &&
      movement.inventoryItem.variantId === dto.variantId;

    if (!sameRequest) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',

        message:
          'Idempotency key was already used for another inventory operation',
      });
    }
  }

  private assertReservationIdempotency(
    reservation: {
      quantity: number;

      inventoryItem: {
        warehouseId: string;
        variantId: string;
      };
    },
    dto: ReserveStockDto,
  ): void {
    const sameRequest =
      reservation.quantity === dto.quantity &&
      reservation.inventoryItem.warehouseId === dto.warehouseId &&
      reservation.inventoryItem.variantId === dto.variantId;

    if (!sameRequest) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',

        message: 'Idempotency key was already used for another reservation',
      });
    }
  }

  private toInventoryBalance(item: {
    id: string;
    warehouseId: string;
    variantId: string;
    onHand: number;
    reserved: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryBalanceRow {
    return {
      ...item,
      available: item.onHand - item.reserved,
    };
  }

  private getTransitionMovementType(
    status: ReservationTransition,
  ): InventoryMovementType {
    switch (status) {
      case InventoryReservationStatus.RELEASED:
        return InventoryMovementType.RESERVATION_RELEASED;

      case InventoryReservationStatus.COMMITTED:
        return InventoryMovementType.RESERVATION_COMMITTED;

      case InventoryReservationStatus.EXPIRED:
        return InventoryMovementType.RESERVATION_EXPIRED;
    }
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  private isUniqueError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private rethrowInventoryError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException({
            code: 'INVENTORY_UNIQUE_CONFLICT',

            message: 'Inventory operation conflicts with existing data',
          });

        case 'P2003':
          throw new ConflictException({
            code: 'INVENTORY_RELATION_CONFLICT',

            message: 'Inventory relationship changed during the request',
          });

        case 'P2025':
          throw new NotFoundException({
            code: 'INVENTORY_RECORD_NOT_FOUND',

            message: 'Inventory record was not found',
          });

        case 'P2034':
          throw new ConflictException({
            code: 'INVENTORY_CONCURRENT_UPDATE',

            message: 'Inventory was modified concurrently. Retry the request.',
          });

        default:
          throw error;
      }
    }

    throw error;
  }

  private getMovementSelect() {
    return {
      id: true,
      inventoryItemId: true,
      reservationId: true,
      type: true,
      deltaOnHand: true,
      deltaReserved: true,
      balanceOnHandAfter: true,
      balanceReservedAfter: true,
      idempotencyKey: true,
      referenceId: true,
      note: true,
      createdAt: true,

      inventoryItem: {
        select: {
          id: true,
          warehouseId: true,
          variantId: true,
          onHand: true,
          reserved: true,
          version: true,
        },
      },
    } satisfies Prisma.InventoryMovementSelect;
  }

  private getReservationSelect() {
    return {
      id: true,
      inventoryItemId: true,
      quantity: true,
      status: true,
      idempotencyKey: true,
      referenceId: true,
      expiresAt: true,
      releasedAt: true,
      committedAt: true,
      expiredAt: true,
      createdAt: true,
      updatedAt: true,

      inventoryItem: {
        select: {
          id: true,
          warehouseId: true,
          variantId: true,
          onHand: true,
          reserved: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    } satisfies Prisma.InventoryReservationSelect;
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
