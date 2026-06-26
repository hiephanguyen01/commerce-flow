'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPublicProducts } from '../api/catalog-api';
import type { PublicProductFilters } from '../types/catalog';
import { catalogQueryKeys } from './catalog-query-keys';
export function usePublicProducts(filters: PublicProductFilters) {
  return useQuery({
    queryKey: catalogQueryKeys.productList(filters),
    queryFn: ({ signal }) => getPublicProducts(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
