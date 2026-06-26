'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct, type UpdateProductInput } from '../api/admin-products-api';
import { adminProductQueryKeys } from './admin-product-query-keys';
import { invalidatePublicCatalog } from './invalidate-public-catalog';
import { invalidateProductData } from './use-product-variant-mutations';
type UpdateProductVariables = { productId: string; input: UpdateProductInput };
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: UpdateProductVariables) => updateProduct(productId, input),
    onSuccess: async (product) => {
      queryClient.setQueryData(adminProductQueryKeys.detail(product.id), product);
      await queryClient.invalidateQueries({ queryKey: adminProductQueryKeys.lists() });
      await Promise.all([
        invalidateProductData(queryClient, product.id),

        invalidatePublicCatalog(queryClient),
      ]);
    },
  });
}
