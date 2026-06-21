export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AdminProductCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type AdminProductImage = {
  id: string;
  publicUrl: string;
  altText: string | null;
};

export type AdminProductVariantSummary = {
  id: string;
  priceAmount: number;
  compareAtPrice: number | null;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  version: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;

  category: AdminProductCategory | null;

  images: AdminProductImage[];

  variants: AdminProductVariantSummary[];

  _count: {
    variants: number;
    images: number;
  };
};

export type AdminProductDetail = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  status: ProductStatus;
  version: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;

  category: AdminProductCategory | null;

  variants: Array<{
    id: string;
    name: string;
    sku: string;
    priceAmount: number;
    compareAtPrice: number | null;
    currency: string;
    status: 'ACTIVE' | 'INACTIVE';
    attributes: Record<string, string> | null;
    sortOrder: number;
    version: number;
  }>;

  images: Array<{
    id: string;
    publicUrl: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
};

export type AdminProductsResponse = {
  items: AdminProductListItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminProductFilters = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'updated_desc';
};

export type AdminCategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};
