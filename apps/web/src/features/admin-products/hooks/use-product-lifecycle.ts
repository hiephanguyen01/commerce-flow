'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  archiveProduct,
  publishProduct,
  unpublishProduct,
  type ProductLifecycleInput,
} from '../api/admin-product-lifecycle-api';
import type { AdminProductDetail } from '../types/admin-product';
import { adminProductQueryKeys } from './admin-product-query-keys';

async function synchronizeProduct(
  queryClient: QueryClient,
  product: AdminProductDetail,
): Promise<void> {
  queryClient.setQueryData(adminProductQueryKeys.detail(product.id), product);

  /*
   * Product detail đã được cập nhật từ mutation response.
   * Product list vẫn cần invalidate để status, version,
   * publishedAt và archivedAt được đồng bộ.
   */
  await queryClient.invalidateQueries({
    queryKey: adminProductQueryKeys.lists(),
  });
}

export function usePublishProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductLifecycleInput) => publishProduct(input),

    onSuccess: async (product) => {
      await synchronizeProduct(queryClient, product);
    },
  });
}

export function useUnpublishProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductLifecycleInput) => unpublishProduct(input),

    onSuccess: async (product) => {
      await synchronizeProduct(queryClient, product);
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductLifecycleInput) => archiveProduct(input),

    onSuccess: async (product) => {
      await synchronizeProduct(queryClient, product);
    },
  });
}
