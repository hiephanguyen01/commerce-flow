'use client';

import { useQuery } from '@tanstack/react-query';
import { getProductImages } from '../api/admin-product-images-api';
import { adminProductQueryKeys } from './admin-product-query-keys';

export function useProductImages(productId: string) {
  return useQuery({
    queryKey: adminProductQueryKeys.images(productId),

    queryFn: ({ signal }) => getProductImages(productId, signal),

    enabled: Boolean(productId),

    staleTime: 30_000,
  });
}
