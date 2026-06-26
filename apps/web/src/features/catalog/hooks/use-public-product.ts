'use client';
import { useQuery } from '@tanstack/react-query';
import { getPublicProduct } from '../api/catalog-api';
import { catalogQueryKeys } from './catalog-query-keys';
export function usePublicProduct(slug: string) {
  return useQuery({
    queryKey: catalogQueryKeys.productDetail(slug),
    queryFn: ({ signal }) => getPublicProduct(slug, signal),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });
}
