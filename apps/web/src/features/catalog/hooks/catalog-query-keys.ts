import type { PublicProductFilters } from '../types/catalog';

export const catalogQueryKeys = {
  all: ['catalog'] as const,

  categories: () => [...catalogQueryKeys.all, 'categories'] as const,

  productLists: () => [...catalogQueryKeys.all, 'products', 'list'] as const,

  productList: (filters: PublicProductFilters) =>
    [...catalogQueryKeys.productLists(), filters] as const,

  productDetails: () => [...catalogQueryKeys.all, 'products', 'detail'] as const,

  productDetail: (slug: string) => [...catalogQueryKeys.productDetails(), slug] as const,
};
