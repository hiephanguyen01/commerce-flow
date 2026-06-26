export type PublicCategoryTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  children: PublicCategoryTreeNode[];
};
export type PublicProductImage = {
  id?: string;
  publicUrl: string;
  altText: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};
export type PublicProductVariant = {
  id: string;
  name: string;
  sku?: string;
  priceAmount: number;
  compareAtPrice: number | null;
  currency: string;
  attributes?: Record<string, string> | null;
};
export type PublicProductListItem = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  publishedAt: string | null;
  category: { id: string; name: string; slug: string } | null;
  images: PublicProductImage[];
  variants: PublicProductVariant[];
};
export type PublicProductDetail = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  publishedAt: string | null;
  category: { id: string; name: string; slug: string } | null;
  variants: PublicProductVariant[];
  images: PublicProductImage[];
};
export type PublicProductSort = 'newest' | 'name_asc' | 'name_desc';
export type PublicProductFilters = {
  page: number;
  limit: number;
  search?: string;
  categorySlug?: string;
  sort: PublicProductSort;
};
export type PublicProductsResponse = {
  items: PublicProductListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
