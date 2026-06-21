import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { CategoryQueryDto } from '../dto/category/category-query.dto.js';
import { CreateCategoryDto } from '../dto/category/create-category.dto.js';
import { UpdateCategoryDto } from '../dto/category/update-category.dto.js';
import type { CategoryTreeNode } from '../types/category-tree.js';

const categoryParentSelect = {
  id: true,
  parentId: true,
} satisfies Prisma.CategorySelect;

type CategoryParent = Prisma.CategoryGetPayload<{
  select: typeof categoryParentSelect;
}>;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: this.normalizeSlug(dto.slug),

          description: this.normalizeOptionalText(dto.description),

          parentId: dto.parentId ?? null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },

        select: this.getAdminCategorySelect(),
      });
    } catch (error) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async findAdminCategories(query: CategoryQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim();

    const where: Prisma.CategoryWhereInput = {
      ...(query.parentId
        ? {
            parentId: query.parentId,
          }
        : {}),

      ...(query.isActive !== undefined
        ? {
            isActive: query.isActive,
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
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: query.limit,

        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            name: 'asc',
          },
        ],

        select: this.getAdminCategorySelect(),
      }),

      this.prisma.category.count({
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

  async findAdminCategoryById(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      select: this.getAdminCategorySelect(),
    });

    if (!category) {
      throw this.categoryNotFound();
    }

    return category;
  }

  async findPublicCategories(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],

      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
    });

    const categoryMap = new Map<string, CategoryTreeNode>();

    for (const category of categories) {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      const node = categoryMap.get(category.id);

      if (!node) {
        continue;
      }

      if (!category.parentId) {
        roots.push(node);
        continue;
      }

      const parent = categoryMap.get(category.parentId);

      /*
       * Nếu parent không active, category con
       * cũng không xuất hiện ngoài storefront.
       */
      if (!parent) {
        continue;
      }

      parent.children.push(node);
    }

    return roots;
  }

  async update(categoryId: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      select: {
        id: true,
      },
    });

    if (!current) {
      throw this.categoryNotFound();
    }

    if (dto.parentId !== undefined) {
      await this.ensureValidParent(categoryId, dto.parentId);
    }

    try {
      return await this.prisma.category.update({
        where: {
          id: categoryId,
        },

        data: {
          ...(dto.name !== undefined
            ? {
                name: dto.name.trim(),
              }
            : {}),

          ...(dto.slug !== undefined
            ? {
                slug: this.normalizeSlug(dto.slug),
              }
            : {}),

          ...(dto.description !== undefined
            ? {
                description: this.normalizeOptionalText(dto.description),
              }
            : {}),

          ...(dto.parentId !== undefined
            ? {
                parentId: dto.parentId,
              }
            : {}),

          ...(dto.isActive !== undefined
            ? {
                isActive: dto.isActive,
              }
            : {}),

          ...(dto.sortOrder !== undefined
            ? {
                sortOrder: dto.sortOrder,
              }
            : {}),
        },

        select: this.getAdminCategorySelect(),
      });
    } catch (error) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async remove(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      select: {
        id: true,

        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw this.categoryNotFound();
    }

    if (category._count.children > 0) {
      throw new ConflictException({
        code: 'CATEGORY_HAS_CHILDREN',
        message: 'Category with child categories cannot be deleted',
      });
    }

    if (category._count.products > 0) {
      throw new ConflictException({
        code: 'CATEGORY_HAS_PRODUCTS',
        message: 'Category with products cannot be deleted',
      });
    }

    await this.prisma.category.delete({
      where: {
        id: categoryId,
      },
    });
  }

  private async ensureValidParent(
    categoryId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    if (parentId === categoryId) {
      throw new UnprocessableEntityException({
        code: 'CATEGORY_CANNOT_PARENT_ITSELF',
        message: 'Category cannot be its own parent',
      });
    }

    let currentCategoryId: string | null = parentId;

    let traversedDepth = 0;
    const maximumDepth = 50;

    while (currentCategoryId) {
      if (currentCategoryId === categoryId) {
        throw new UnprocessableEntityException({
          code: 'CATEGORY_CYCLE_DETECTED',
          message: 'Category hierarchy cannot contain a cycle',
        });
      }

      const current: CategoryParent | null =
        await this.prisma.category.findUnique({
          where: {
            id: currentCategoryId,
          },
          select: categoryParentSelect,
        });

      if (!current) {
        throw new NotFoundException({
          code: 'PARENT_CATEGORY_NOT_FOUND',
          message: 'Parent category was not found',
        });
      }

      currentCategoryId = current.parentId;

      traversedDepth += 1;

      if (traversedDepth > maximumDepth) {
        throw new UnprocessableEntityException({
          code: 'CATEGORY_TREE_TOO_DEEP',
          message: 'Category hierarchy exceeds the maximum depth',
        });
      }
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'PARENT_CATEGORY_NOT_FOUND',
        message: 'Parent category was not found',
      });
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private categoryNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'CATEGORY_NOT_FOUND',
      message: 'Category was not found',
    });
  }

  private handleUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'CATEGORY_SLUG_ALREADY_EXISTS',
        message: 'Category slug already exists',
      });
    }
  }

  private getAdminCategorySelect() {
    return {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,

      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      _count: {
        select: {
          children: true,
          products: true,
        },
      },
    } satisfies Prisma.CategorySelect;
  }
}
