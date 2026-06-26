'use client';
import { parseApiError } from '@/lib/http/api-error';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  activateProductVariant,
  createProductVariant,
  deactivateProductVariant,
  deleteProductVariant,
  updateProductVariant,
  type UpdateVariantInput,
} from '../api/admin-product-variants-api';
import type { VariantPayload } from '../schemas/variant-form.schema';
import type { AdminProductDetail, AdminProductVariant } from '../types/admin-product';
import { adminProductQueryKeys } from './admin-product-query-keys';
function sortVariants(variants: AdminProductVariant[]): AdminProductVariant[] {
  return [...variants].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

function replaceVariant(
  product: AdminProductDetail | undefined,
  variant: AdminProductVariant,
): AdminProductDetail | undefined {
  if (!product) {
    return product;
  }
  const exists = product.variants.some((currentVariant) => currentVariant.id === variant.id);
  const variants = exists
    ? product.variants.map((currentVariant) =>
        currentVariant.id === variant.id ? variant : currentVariant,
      )
    : [...product.variants, variant];
  return { ...product, variants: sortVariants(variants) };
}
function removeVariantFromProduct(
  product: AdminProductDetail | undefined,
  variantId: string,
): AdminProductDetail | undefined {
  if (!product) {
    return product;
  }
  return {
    ...product,
    variants: product.variants.filter((variant) => variant.id !== variantId),
  };
}
export async function invalidateProductData(
  queryClient: QueryClient,
  productId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminProductQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: adminProductQueryKeys.detail(productId) }),
  ]);
}

async function refreshProductAfterConflict(
  error: unknown,
  queryClient: QueryClient,
  productId: string,
): Promise<void> {
  const { code } = parseApiError(error);

  if (code === 'PRODUCT_VARIANT_VERSION_CONFLICT' || code === 'PRODUCT_VARIANT_STATUS_CONFLICT') {
    await queryClient.invalidateQueries({ queryKey: adminProductQueryKeys.detail(productId) });
  }
}
export function useCreateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VariantPayload) => createProductVariant(productId, input),
    onSuccess: async (variant) => {
      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => replaceVariant(current, variant),
      );
      await invalidateProductData(queryClient, productId);
    },
  });
}
export function useUpdateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: UpdateVariantInput }) =>
      updateProductVariant(productId, variantId, input),
    onSuccess: async (variant) => {
      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => replaceVariant(current, variant),
      );
      await invalidateProductData(queryClient, productId);
    },
    onError: (error) => refreshProductAfterConflict(error, queryClient, productId),
  });
}
export function useActivateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, expectedVersion }: { variantId: string; expectedVersion: number }) =>
      activateProductVariant(productId, variantId, expectedVersion),
    onSuccess: async (variant) => {
      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => replaceVariant(current, variant),
      );
      await invalidateProductData(queryClient, productId);
    },
    onError: (error) => refreshProductAfterConflict(error, queryClient, productId),
  });
}
export function useDeactivateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, expectedVersion }: { variantId: string; expectedVersion: number }) =>
      deactivateProductVariant(productId, variantId, expectedVersion),
    onSuccess: async (variant) => {
      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => replaceVariant(current, variant),
      );
      await invalidateProductData(queryClient, productId);
    },
    onError: (error) => refreshProductAfterConflict(error, queryClient, productId),
  });
}
export function useDeleteProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, expectedVersion }: { variantId: string; expectedVersion: number }) =>
      deleteProductVariant(productId, variantId, expectedVersion),
    onSuccess: async (_response, variables) => {
      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => removeVariantFromProduct(current, variables.variantId),
      );
      await invalidateProductData(queryClient, productId);
    },
    onError: (error) => refreshProductAfterConflict(error, queryClient, productId),
  });
}
