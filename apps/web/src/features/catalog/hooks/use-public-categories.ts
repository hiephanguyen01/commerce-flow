'use client';
import { useQuery } from '@tanstack/react-query';
import { getPublicCategories } from '../api/catalog-api';
import { catalogQueryKeys } from './catalog-query-keys';
export function usePublicCategories() {
  return useQuery({
    queryKey: catalogQueryKeys.categories(),
    queryFn: ({ signal }) => getPublicCategories(signal),
    staleTime: 5 * 60_000,
  });
}
