'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createProduct, type CreateProductInput } from '../api/admin-products-api';
import { adminProductQueryKeys } from './admin-product-query-keys';

export function useCreateProduct(locale: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),

    onSuccess: async (product) => {
      queryClient.setQueryData(adminProductQueryKeys.detail(product.id), product);

      await queryClient.invalidateQueries({
        queryKey: adminProductQueryKeys.lists(),
      });

      router.replace(`/${locale}/admin/products/${product.id}`);
    },
  });
}
