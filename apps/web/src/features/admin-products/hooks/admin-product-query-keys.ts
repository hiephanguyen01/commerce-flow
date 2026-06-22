import { AdminProductFilters } from '../types/admin-product';

export const adminProductQueryKeys = {
  all: ['admin-products'] as const,

  lists: () => [...adminProductQueryKeys.all, 'list'] as const,

  list: (filters: AdminProductFilters) => [...adminProductQueryKeys.lists(), filters] as const,

  details: () => [...adminProductQueryKeys.all, 'detail'] as const,

  detail: (productId: string) => [...adminProductQueryKeys.details(), productId] as const,

  images: (productId: string) => [...adminProductQueryKeys.detail(productId), 'images'] as const,

  categories: () => ['admin-categories'] as const,
};
