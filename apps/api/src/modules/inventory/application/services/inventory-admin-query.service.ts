import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { ListInventoryItemsQueryDto } from '../dto/list-inventory-items-query.dto.js';
import { ListInventoryMovementsQueryDto } from '../dto/list-inventory-movements-query.dto.js';
import { ListWarehousesQueryDto } from '../dto/list-warehouses-query.dto.js';
import { LowStockQueryDto } from '../dto/low-stock-query.dto.js';

type LowStockRow = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  variantId: string;
  variantName: string;
  sku: string;
  productId: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  updatedAt: Date;
};

type CountRow = {
  total: number;
};

@Injectable()
export class InventoryAdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findWarehouses(query: ListWarehousesQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.WarehouseWhereInput = {
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: search,

                  mode: 'insensitive',
                },
              },

              {
                name: {
                  contains: search,

                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: [
          {
            status: 'asc',
          },
          {
            code: 'asc',
          },
        ],

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              inventoryItems: true,
            },
          },
        },
      }),

      this.prisma.warehouse.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  async findInventoryItems(query: ListInventoryItemsQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.InventoryItemWhereInput = {
      ...(query.warehouseId
        ? {
            warehouseId: query.warehouseId,
          }
        : {}),

      ...(query.variantId
        ? {
            variantId: query.variantId,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                variant: {
                  sku: {
                    contains: search,

                    mode: 'insensitive',
                  },
                },
              },

              {
                variant: {
                  name: {
                    contains: search,

                    mode: 'insensitive',
                  },
                },
              },

              {
                variant: {
                  product: {
                    name: {
                      contains: search,

                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],

        select: {
          id: true,
          warehouseId: true,
          variantId: true,
          onHand: true,
          reserved: true,
          version: true,
          createdAt: true,
          updatedAt: true,

          warehouse: {
            select: {
              id: true,
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

              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.inventoryItem.count({
        where,
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,

        available: item.onHand - item.reserved,
      })),

      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  async findLowStock(query: LowStockQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const searchPattern = search ? `%${search}%` : null;

    const warehouseCondition = query.warehouseId
      ? Prisma.sql`
            AND ii."warehouse_id" =
              ${query.warehouseId}::uuid
          `
      : Prisma.empty;

    const searchCondition = searchPattern
      ? Prisma.sql`
            AND (
              v."sku" ILIKE
                ${searchPattern}

              OR v."name" ILIKE
                ${searchPattern}

              OR p."name" ILIKE
                ${searchPattern}
            )
          `
      : Prisma.empty;

    const whereSql = Prisma.sql`
        WHERE
          (
            ii."on_hand" -
            ii."reserved"
          ) <= ${query.threshold}

          ${warehouseCondition}
          ${searchCondition}
      `;

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<LowStockRow[]>(
        Prisma.sql`
            SELECT
              ii."id",

              ii."warehouse_id"
                AS "warehouseId",

              w."code"
                AS "warehouseCode",

              w."name"
                AS "warehouseName",

              ii."variant_id"
                AS "variantId",

              v."name"
                AS "variantName",

              v."sku",

              p."id"
                AS "productId",

              p."name"
                AS "productName",

              ii."on_hand"
                AS "onHand",

              ii."reserved",

              (
                ii."on_hand" -
                ii."reserved"
              ) AS "available",

              ii."version",

              ii."updated_at"
                AS "updatedAt"

            FROM "inventory_items" ii

            INNER JOIN "warehouses" w
              ON w."id" =
                ii."warehouse_id"

            INNER JOIN "product_variants" v
              ON v."id" =
                ii."variant_id"

            INNER JOIN "products" p
              ON p."id" =
                v."product_id"

            ${whereSql}

            ORDER BY
              (
                ii."on_hand" -
                ii."reserved"
              ) ASC,

              ii."updated_at" DESC,

              ii."id" ASC

            LIMIT ${query.limit}
            OFFSET ${skip}
          `,
      ),

      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`
            SELECT
              COUNT(*)::int
                AS "total"

            FROM "inventory_items" ii

            INNER JOIN "warehouses" w
              ON w."id" =
                ii."warehouse_id"

            INNER JOIN "product_variants" v
              ON v."id" =
                ii."variant_id"

            INNER JOIN "products" p
              ON p."id" =
                v."product_id"

            ${whereSql}
          `,
      ),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      items,

      threshold: query.threshold,

      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  async findMovements(query: ListInventoryMovementsQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.type
        ? {
            type: query.type,
          }
        : {}),

      ...(query.referenceId
        ? {
            referenceId: {
              contains: query.referenceId.trim(),

              mode: 'insensitive',
            },
          }
        : {}),

      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from
                ? {
                    gte: new Date(query.from),
                  }
                : {}),

              ...(query.to
                ? {
                    lte: new Date(query.to),
                  }
                : {}),
            },
          }
        : {}),

      inventoryItem: {
        ...(query.warehouseId
          ? {
              warehouseId: query.warehouseId,
            }
          : {}),

        ...(query.variantId
          ? {
              variantId: query.variantId,
            }
          : {}),
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        select: {
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
              warehouse: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },

              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,

                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },

          reservation: {
            select: {
              id: true,
              status: true,
              quantity: true,
              expiresAt: true,
            },
          },
        },
      }),

      this.prisma.inventoryMovement.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  private createPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,

      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }
}
