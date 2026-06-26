export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AdminProductCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
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

  images: AdminProductImageSummary[];

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
  images: AdminProductImageSummary[];

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

export type ProductVariantStatus = 'ACTIVE' | 'INACTIVE';

export type AdminProductVariant = {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  priceAmount: number;
  compareAtPrice: number | null;
  currency: string;
  status: ProductVariantStatus;

  attributes: Record<string, string> | null;

  sortOrder: number;
  version: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VariantMutationResponse = {
  variant: AdminProductVariant;
  productVersion: number;
};

export type DeleteVariantResponse = {
  productVersion: number;
};

export type AdminProductImage = {
  id: string;
  productId: string;
  objectKey: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  etag: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageMutationResponse = {
  image: AdminProductImage;
  productVersion: number;
};

export type ProductImageReorderResponse = {
  images: AdminProductImage[];
  productVersion: number;
};

export type DeleteProductImageResponse = {
  productVersion: number;
};

export type AdminProductImageSummary = {
  id: string;
  publicUrl: string;
  altText: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};
