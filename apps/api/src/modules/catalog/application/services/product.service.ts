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
import {
  AdminProductQueryDto,
  AdminProductSort,
} from '../dto/product/admin-product-query.dto.js';
import { CreateProductDto } from '../dto/product/create-product.dto.js';
import {
  PublicProductQueryDto,
  PublicProductSort,
} from '../dto/product/public-product-query.dto.js';
import { UpdateProductDto } from '../dto/product/update-product.dto.js';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly catalogCache: CatalogCacheService,
  ) {}

  async create(dto: CreateProductDto) {
    if (dto.categoryId) {
      await this.ensureActiveCategoryExists(dto.categoryId);
    }

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name.trim(),

          slug: this.normalizeSlug(dto.slug),

          categoryId: dto.categoryId ?? null,

          shortDescription: this.normalizeOptionalText(dto.shortDescription),

          description: this.normalizeOptionalText(dto.description),

          status: ProductStatus.DRAFT,
          version: 1,
        },

        select: this.getAdminProductDetailSelect(),
      });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }
  async findAdminProducts(query: AdminProductQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(query.categoryId
        ? {
            categoryId: query.categoryId,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                variants: {
                  some: {
                    sku: {
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
      this.prisma.product.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: this.getAdminOrderBy(query.sort),

        select: this.getAdminProductListSelect(),
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: {
        page: query.page,
        limit: query.limit,
        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }
  async findAdminProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },

      select: this.getAdminProductDetailSelect(),
    });

    if (!product) {
      throw this.productNotFound();
    }

    return product;
  }
  async update(productId: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },

      select: {
        id: true,
        slug: true,
        status: true,
        version: true,
      },
    });

    if (!current) {
      throw this.productNotFound();
    }

    if (current.status === ProductStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'ARCHIVED_PRODUCT_CANNOT_BE_UPDATED',
        message: 'Archived product cannot be updated',
      });
    }

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.ensureActiveCategoryExists(dto.categoryId);
    }

    const { expectedVersion, ...changes } = dto;

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.product.updateMany({
          where: {
            id: productId,
            version: expectedVersion,
          },

          data: {
            ...(changes.name !== undefined
              ? {
                  name: changes.name.trim(),
                }
              : {}),

            ...(changes.slug !== undefined
              ? {
                  slug: this.normalizeSlug(changes.slug),
                }
              : {}),

            ...(changes.categoryId !== undefined
              ? {
                  categoryId: changes.categoryId,
                }
              : {}),

            ...(changes.shortDescription !== undefined
              ? {
                  shortDescription: this.normalizeOptionalText(
                    changes.shortDescription,
                  ),
                }
              : {}),

            ...(changes.description !== undefined
              ? {
                  description: this.normalizeOptionalText(changes.description),
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

        return tx.product.findUniqueOrThrow({
          where: {
            id: productId,
          },

          select: this.getAdminProductDetailSelect(),
        });
      });

      return product;
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }
  async publish(productId: string, expectedVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          status: true,
          version: true,

          variants: {
            where: {
              status: ProductVariantStatus.ACTIVE,
            },

            select: {
              id: true,
            },

            take: 1,
          },
        },
      });

      if (!product) {
        throw this.productNotFound();
      }

      if (product.version !== expectedVersion) {
        throw this.versionConflict();
      }

      if (product.status !== ProductStatus.DRAFT) {
        throw new ConflictException({
          code: 'PRODUCT_CANNOT_BE_PUBLISHED',
          message: 'Only draft products can be published',
        });
      }

      if (product.variants.length === 0) {
        throw new UnprocessableEntityException({
          code: 'PRODUCT_REQUIRES_ACTIVE_VARIANT',
          message:
            'Product requires at least one active variant before publishing',
        });
      }

      const updateResult = await tx.product.updateMany({
        where: {
          id: productId,
          version: expectedVersion,
          status: ProductStatus.DRAFT,
        },

        data: {
          status: ProductStatus.PUBLISHED,

          publishedAt: new Date(),
          archivedAt: null,

          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        throw this.versionConflict();
      }

      return tx.product.findUniqueOrThrow({
        where: {
          id: productId,
        },

        select: this.getAdminProductDetailSelect(),
      });
    });
  }

  async unpublish(productId: string, expectedVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          status: true,
          version: true,
        },
      });

      if (!product) {
        throw this.productNotFound();
      }

      if (product.version !== expectedVersion) {
        throw this.versionConflict();
      }

      if (product.status !== ProductStatus.PUBLISHED) {
        throw new ConflictException({
          code: 'PRODUCT_CANNOT_BE_UNPUBLISHED',
          message: 'Only published products can be unpublished',
        });
      }

      const updateResult = await tx.product.updateMany({
        where: {
          id: productId,
          version: expectedVersion,
          status: ProductStatus.PUBLISHED,
        },

        data: {
          status: ProductStatus.DRAFT,
          publishedAt: null,

          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        throw this.versionConflict();
      }

      return tx.product.findUniqueOrThrow({
        where: {
          id: productId,
        },

        select: this.getAdminProductDetailSelect(),
      });
    });
  }

  async archive(productId: string, expectedVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          status: true,
          version: true,
        },
      });

      if (!product) {
        throw this.productNotFound();
      }

      if (product.version !== expectedVersion) {
        throw this.versionConflict();
      }

      if (product.status === ProductStatus.ARCHIVED) {
        throw new ConflictException({
          code: 'PRODUCT_ALREADY_ARCHIVED',
          message: 'Product is already archived',
        });
      }

      const updateResult = await tx.product.updateMany({
        where: {
          id: productId,
          version: expectedVersion,

          status: {
            in: [ProductStatus.DRAFT, ProductStatus.PUBLISHED],
          },
        },

        data: {
          status: ProductStatus.ARCHIVED,

          publishedAt: null,
          archivedAt: new Date(),

          version: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        throw this.versionConflict();
      }

      return tx.product.findUniqueOrThrow({
        where: {
          id: productId,
        },

        select: this.getAdminProductDetailSelect(),
      });
    });
  }

  async findPublishedProducts(query: PublicProductQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,

      variants: {
        some: {
          status: ProductVariantStatus.ACTIVE,
        },
      },

      OR: [
        {
          categoryId: null,
        },
        {
          category: {
            is: {
              isActive: true,
            },
          },
        },
      ],

      ...(query.categorySlug
        ? {
            category: {
              is: {
                slug: query.categorySlug,
                isActive: true,
              },
            },
          }
        : {}),

      ...(search
        ? {
            AND: [
              {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    slug: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    shortDescription: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: this.getPublicOrderBy(query.sort),

        select: this.getPublicProductListSelect(),
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: {
        page: query.page,
        limit: query.limit,
        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findPublishedProductBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);

    const product = await this.prisma.product.findFirst({
      where: {
        slug: normalizedSlug,
        status: ProductStatus.PUBLISHED,

        variants: {
          some: {
            status: ProductVariantStatus.ACTIVE,
          },
        },

        OR: [
          {
            categoryId: null,
          },
          {
            category: {
              is: {
                isActive: true,
              },
            },
          },
        ],
      },

      select: this.getPublicProductDetailSelect(),
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PUBLISHED_PRODUCT_NOT_FOUND',
        message: 'Published product was not found',
      });
    }

    return product;
  }

  async findPublicProducts(query: PublicProductQueryDto) {
    return this.catalogCache.getPublicProductList(query, () =>
      this.loadPublicProducts(query),
    );
  }

  private async loadPublicProducts(query: PublicProductQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const conditions: Prisma.ProductWhereInput[] = [
      {
        status: ProductStatus.PUBLISHED,
      },

      {
        variants: {
          some: {
            status: ProductVariantStatus.ACTIVE,
          },
        },
      },
    ];

    if (query.categorySlug) {
      conditions.push({
        category: {
          is: {
            slug: query.categorySlug,

            isActive: true,
          },
        },
      });
    } else {
      conditions.push({
        OR: [
          {
            categoryId: null,
          },

          {
            category: {
              is: {
                isActive: true,
              },
            },
          },
        ],
      });
    }

    if (search) {
      conditions.push({
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },

          {
            slug: {
              contains: search,
              mode: 'insensitive',
            },
          },

          {
            shortDescription: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = {
      AND: conditions,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: this.getPublicOrderBy(query.sort),

        select: this.getPublicProductListSelect(),
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      items,

      pagination: {
        page: query.page,
        limit: query.limit,
        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }
  async findPublicProductBySlug(slug: string) {
    const product = await this.catalogCache.getPublicProductDetail(slug, () =>
      this.loadPublicProductBySlug(slug),
    );

    if (!product) {
      throw new NotFoundException({
        code: 'PUBLIC_PRODUCT_NOT_FOUND',

        message: 'Product was not found',
      });
    }

    return product;
  }

  private loadPublicProductBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),

        status: ProductStatus.PUBLISHED,

        variants: {
          some: {
            status: ProductVariantStatus.ACTIVE,
          },
        },

        OR: [
          {
            categoryId: null,
          },

          {
            category: {
              is: {
                isActive: true,
              },
            },
          },
        ],
      },

      select: this.getPublicProductDetailSelect(),
    });
  }
  private getAdminProductListSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      status: true,
      version: true,
      publishedAt: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },

      images: {
        where: {
          isPrimary: true,
        },

        orderBy: {
          sortOrder: 'asc',
        },

        take: 1,

        select: {
          id: true,
          publicUrl: true,
          altText: true,
        },
      },

      variants: {
        orderBy: {
          priceAmount: 'asc',
        },

        take: 1,

        select: {
          id: true,
          priceAmount: true,
          compareAtPrice: true,
          currency: true,
          status: true,
        },
      },

      _count: {
        select: {
          variants: true,
          images: true,
        },
      },
    } satisfies Prisma.ProductSelect;
  }
  private getAdminProductDetailSelect() {
    return {
      id: true,
      categoryId: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      status: true,
      version: true,
      publishedAt: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },

      variants: {
        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],

        select: {
          id: true,
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
        },
      },

      images: {
        orderBy: [
          {
            isPrimary: 'desc',
          },
          {
            sortOrder: 'asc',
          },
        ],

        select: {
          id: true,
          objectKey: true,
          publicUrl: true,
          altText: true,
          isPrimary: true,
          sortOrder: true,
          createdAt: true,
        },
      },
    } satisfies Prisma.ProductSelect;
  }

  private getPublicProductListSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      publishedAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      images: {
        where: {
          isPrimary: true,
        },

        orderBy: {
          sortOrder: 'asc',
        },

        take: 1,

        select: {
          publicUrl: true,
          altText: true,
        },
      },

      variants: {
        where: {
          status: ProductVariantStatus.ACTIVE,
        },

        orderBy: {
          priceAmount: 'asc',
        },

        take: 1,

        select: {
          id: true,
          name: true,
          priceAmount: true,
          compareAtPrice: true,
          currency: true,
        },
      },
    } satisfies Prisma.ProductSelect;
  }

  private getPublicProductDetailSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      publishedAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      variants: {
        where: {
          status: ProductVariantStatus.ACTIVE,
        },

        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            priceAmount: 'asc',
          },
        ],

        select: {
          id: true,
          name: true,
          sku: true,
          priceAmount: true,
          compareAtPrice: true,
          currency: true,
          attributes: true,
        },
      },

      images: {
        orderBy: [
          {
            isPrimary: 'desc',
          },
          {
            sortOrder: 'asc',
          },
        ],

        select: {
          id: true,
          publicUrl: true,
          altText: true,
          isPrimary: true,
          sortOrder: true,
        },
      },
    } satisfies Prisma.ProductSelect;
  }

  private getAdminOrderBy(
    sort: AdminProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case AdminProductSort.OLDEST:
        return [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ];

      case AdminProductSort.NAME_ASC:
        return [
          {
            name: 'asc',
          },
          {
            id: 'asc',
          },
        ];

      case AdminProductSort.NAME_DESC:
        return [
          {
            name: 'desc',
          },
          {
            id: 'desc',
          },
        ];

      case AdminProductSort.UPDATED_DESC:
        return [
          {
            updatedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ];

      case AdminProductSort.NEWEST:
      default:
        return [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ];
    }
  }

  private getPublicOrderBy(
    sort: PublicProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case PublicProductSort.NAME_ASC:
        return [
          {
            name: 'asc',
          },
          {
            id: 'asc',
          },
        ];

      case PublicProductSort.NAME_DESC:
        return [
          {
            name: 'desc',
          },
          {
            id: 'desc',
          },
        ];

      case PublicProductSort.NEWEST:
      default:
        return [
          {
            publishedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ];
    }
  }

  private async ensureActiveCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        isActive: true,
      },

      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'ACTIVE_CATEGORY_NOT_FOUND',
        message: 'Active category was not found',
      });
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value == null) {
      return value;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private productNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product was not found',
    });
  }

  private versionConflict(): ConflictException {
    return new ConflictException({
      code: 'PRODUCT_VERSION_CONFLICT',
      message: 'Product was modified by another request',
    });
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PRODUCT_SLUG_ALREADY_EXISTS',
        message: 'Product slug already exists',
      });
    }
  }
}
