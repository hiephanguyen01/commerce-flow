'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAdminProducts } from '../api/admin-products-api';
import type { AdminProductFilters } from '../types/admin-product';
import { adminProductQueryKeys } from './admin-product-query-keys';
export function useAdminProducts(filters: AdminProductFilters) {
  return useQuery({
    queryKey: adminProductQueryKeys.list(filters),
    queryFn: ({ signal }) => getAdminProducts(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
