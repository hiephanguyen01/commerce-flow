import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  ProductVariantStatus,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { CatalogCacheService } from '../../infrastructure/cache/catalog-cache.service.js';
import { CreateVariantDto } from '../dto/variant/create-variant.dto.js';
import { UpdateVariantDto } from '../dto/variant/update-variant.dto.js';

@Injectable()
export class ProductVariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  async create(productId: string, dto: CreateVariantDto) {
    this.ensureValidPrices(dto.priceAmount, dto.compareAtPrice);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await this.ensureMutableProductExists(tx, productId);

        return tx.productVariant.create({
          data: {
            productId,
            name: dto.name.trim(),
            sku: this.normalizeSku(dto.sku),
            priceAmount: dto.priceAmount,
            compareAtPrice: dto.compareAtPrice,
            currency: dto.currency ?? 'VND',
            attributes: dto.attributes,
            sortOrder: dto.sortOrder ?? 0,
          },
          select: this.getAdminVariantSelect(),
        });
      });
      await this.catalogCache.invalidateProducts();

      return result;
    } catch (error) {
      this.rethrowVariantWriteError(error);
    }
  }

  async findAdminVariants(productId: string) {
    await this.ensureProductExists(this.prisma, productId);

    return this.prisma.productVariant.findMany({
      where: {
        productId,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: this.getAdminVariantSelect(),
    });
  }

  async findAdminVariantById(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      select: this.getAdminVariantSelect(),
    });

    if (!variant) {
      throw this.variantNotFound();
    }

    return variant;
  }

  async update(productId: string, variantId: string, dto: UpdateVariantDto) {
    const { expectedVersion, ...changes } = dto;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const current = await this.findMutableVariant(tx, productId, variantId);

        const priceAmount = changes.priceAmount ?? current.priceAmount;
        const compareAtPrice =
          changes.compareAtPrice !== undefined
            ? changes.compareAtPrice
            : current.compareAtPrice;

        this.ensureValidPrices(priceAmount, compareAtPrice);

        const updateResult = await tx.productVariant.updateMany({
          where: {
            id: variantId,
            productId,
            version: expectedVersion,
          },
          data: {
            ...(changes.name !== undefined
              ? {
                  name: changes.name.trim(),
                }
              : {}),
            ...(changes.sku !== undefined
              ? {
                  sku: this.normalizeSku(changes.sku),
                }
              : {}),
            ...(changes.priceAmount !== undefined
              ? {
                  priceAmount: changes.priceAmount,
                }
              : {}),
            ...(changes.compareAtPrice !== undefined
              ? {
                  compareAtPrice: changes.compareAtPrice,
                }
              : {}),
            ...(changes.currency !== undefined
              ? {
                  currency: changes.currency,
                }
              : {}),
            ...(changes.attributes !== undefined
              ? {
                  attributes: changes.attributes,
                }
              : {}),
            ...(changes.sortOrder !== undefined
              ? {
                  sortOrder: changes.sortOrder,
                }
              : {}),
            version: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw this.versionConflict();
        }

        return tx.productVariant.findUniqueOrThrow({
          where: {
            id: variantId,
          },
          select: this.getAdminVariantSelect(),
        });
      });
      await this.catalogCache.invalidateProducts();

      return result;
    } catch (error) {
      this.rethrowVariantWriteError(error);
    }
  }

  async activate(
    productId: string,
    variantId: string,
    expectedVersion: number,
  ) {
    const result = await this.changeStatus(
      productId,
      variantId,
      expectedVersion,
      ProductVariantStatus.INACTIVE,
      ProductVariantStatus.ACTIVE,
    );
    await this.catalogCache.invalidateProducts();
    return result;
  }

  async deactivate(
    productId: string,
    variantId: string,
    expectedVersion: number,
  ) {
    const result = await this.changeStatus(
      productId,
      variantId,
      expectedVersion,
      ProductVariantStatus.ACTIVE,
      ProductVariantStatus.INACTIVE,
    );
    await this.catalogCache.invalidateProducts();
    return result;
  }

  async remove(
    productId: string,
    variantId: string,
    expectedVersion: number,
  ): Promise<void> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const variant = await this.findMutableVariant(tx, productId, variantId);

        if (variant.version !== expectedVersion) {
          throw this.versionConflict();
        }

        if (variant.status === ProductVariantStatus.ACTIVE) {
          await this.ensurePublishedProductKeepsActiveVariant(
            tx,
            productId,
            variantId,
          );
        }

        const deleteResult = await tx.productVariant.deleteMany({
          where: {
            id: variantId,
            productId,
            version: expectedVersion,
          },
        });

        if (deleteResult.count !== 1) {
          throw this.versionConflict();
        }
      });
      await this.catalogCache.invalidateProducts();
      return result;
    } catch (error) {
      this.rethrowVariantWriteError(error);
    }
  }

  private async changeStatus(
    productId: string,
    variantId: string,
    expectedVersion: number,
    currentStatus: ProductVariantStatus,
    nextStatus: ProductVariantStatus,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const variant = await this.findMutableVariant(tx, productId, variantId);

        if (variant.version !== expectedVersion) {
          throw this.versionConflict();
        }

        if (variant.status !== currentStatus) {
          throw new ConflictException({
            code: 'PRODUCT_VARIANT_STATUS_CONFLICT',
            message: `Product variant is already ${variant.status.toLowerCase()}`,
          });
        }

        if (nextStatus === ProductVariantStatus.INACTIVE) {
          await this.ensurePublishedProductKeepsActiveVariant(
            tx,
            productId,
            variantId,
          );
        }

        const updateResult = await tx.productVariant.updateMany({
          where: {
            id: variantId,
            productId,
            version: expectedVersion,
            status: currentStatus,
          },
          data: {
            status: nextStatus,
            version: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw this.versionConflict();
        }

        return tx.productVariant.findUniqueOrThrow({
          where: {
            id: variantId,
          },
          select: this.getAdminVariantSelect(),
        });
      });
    } catch (error) {
      this.rethrowVariantWriteError(error);
    }
  }

  private async findMutableVariant(
    tx: Prisma.TransactionClient,
    productId: string,
    variantId: string,
  ) {
    const variant = await tx.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      select: {
        id: true,
        priceAmount: true,
        compareAtPrice: true,
        status: true,
        version: true,
        product: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!variant) {
      throw this.variantNotFound();
    }

    if (variant.product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'ARCHIVED_PRODUCT_VARIANT_CANNOT_BE_MODIFIED',
        message: 'Variants of an archived product cannot be modified',
      });
    }

    return variant;
  }

  private async ensureProductExists(
    client: Prisma.TransactionClient | PrismaService,
    productId: string,
  ): Promise<void> {
    const product = await client.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw this.productNotFound();
    }
  }

  private async ensureMutableProductExists(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        status: true,
      },
    });

    if (!product) {
      throw this.productNotFound();
    }

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'ARCHIVED_PRODUCT_VARIANT_CANNOT_BE_MODIFIED',
        message: 'Variants of an archived product cannot be modified',
      });
    }
  }

  private async ensurePublishedProductKeepsActiveVariant(
    tx: Prisma.TransactionClient,
    productId: string,
    excludedVariantId: string,
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        status: true,
      },
    });

    if (product?.status !== ProductStatus.PUBLISHED) {
      return;
    }

    const remainingActiveVariant = await tx.productVariant.findFirst({
      where: {
        productId,
        id: {
          not: excludedVariantId,
        },
        status: ProductVariantStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!remainingActiveVariant) {
      throw new UnprocessableEntityException({
        code: 'PUBLISHED_PRODUCT_REQUIRES_ACTIVE_VARIANT',
        message: 'A published product must keep at least one active variant',
      });
    }
  }

  private ensureValidPrices(
    priceAmount: number,
    compareAtPrice: number | null | undefined,
  ): void {
    if (compareAtPrice !== null && compareAtPrice !== undefined) {
      if (compareAtPrice < priceAmount) {
        throw new UnprocessableEntityException({
          code: 'INVALID_COMPARE_AT_PRICE',
          message: 'Compare-at price must be greater than or equal to price',
        });
      }
    }
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private productNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product was not found',
    });
  }

  private variantNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PRODUCT_VARIANT_NOT_FOUND',
      message: 'Product variant was not found',
    });
  }

  private versionConflict(): ConflictException {
    return new ConflictException({
      code: 'PRODUCT_VARIANT_VERSION_CONFLICT',
      message: 'Product variant was modified by another request',
    });
  }

  private rethrowVariantWriteError(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnprocessableEntityException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException({
            code: 'PRODUCT_VARIANT_SKU_ALREADY_EXISTS',
            message: 'Product variant SKU already exists',
          });
        case 'P2003':
          throw new ConflictException({
            code: 'PRODUCT_VARIANT_RELATION_CONFLICT',
            message: 'Product relationships changed during the request',
          });
        case 'P2025':
          throw this.variantNotFound();
        case 'P2034':
          throw new ConflictException({
            code: 'PRODUCT_VARIANT_CONCURRENT_UPDATE',
            message:
              'Product variant was modified by another request. Reload and try again.',
          });
        default:
          throw error;
      }
    }

    throw error;
  }

  private getAdminVariantSelect() {
    return {
      id: true,
      productId: true,
      name: true,
      sku: true,
      priceAmount: true,
      compareAtPrice: true,
      currency: true,
      status: true,
      attributes: true,
      sortOrder: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.ProductVariantSelect;
  }
}
