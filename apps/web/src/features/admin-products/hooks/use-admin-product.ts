'use client';
import { useQuery } from '@tanstack/react-query';
import { getAdminCategories, getAdminProduct } from '../api/admin-products-api';
import { adminProductQueryKeys } from './admin-product-query-keys';
export function useAdminProduct(productId: string) {
  return useQuery({
    queryKey: adminProductQueryKeys.detail(productId),
    queryFn: ({ signal }) => getAdminProduct(productId, signal),
    enabled: Boolean(productId),
  });
}
export function useAdminCategories() {
  return useQuery({
    queryKey: adminProductQueryKeys.categories(),
    queryFn: ({ signal }) => getAdminCategories(signal),
    staleTime: 5 * 60_000,
  });
}
