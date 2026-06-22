import { browserApi } from '@/lib/http/browser-api';
import type { VariantPayload } from '../schemas/variant-form.schema';
import type { AdminProductVariant } from '../types/admin-product';

export type UpdateVariantInput = VariantPayload & {
  expectedVersion: number;
};

export async function getProductVariants(
  productId: string,
  signal?: AbortSignal,
): Promise<AdminProductVariant[]> {
  const { data } = await browserApi.get<AdminProductVariant[]>(
    `/admin/products/${productId}/variants`,
    {
      signal,
    },
  );

  return data;
}

export async function createProductVariant(
  productId: string,
  input: VariantPayload,
): Promise<AdminProductVariant> {
  const { data } = await browserApi.post<AdminProductVariant>(
    `/admin/products/${productId}/variants`,
    input,
  );

  return data;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
): Promise<AdminProductVariant> {
  const { data } = await browserApi.patch<AdminProductVariant>(
    `/admin/products/${productId}/variants/${variantId}`,
    input,
  );

  return data;
}

export async function activateProductVariant(
  productId: string,
  variantId: string,
  expectedVersion: number,
): Promise<AdminProductVariant> {
  const { data } = await browserApi.post<AdminProductVariant>(
    `/admin/products/${productId}/variants/${variantId}/activate`,
    {
      expectedVersion,
    },
  );

  return data;
}

export async function deactivateProductVariant(
  productId: string,
  variantId: string,
  expectedVersion: number,
): Promise<AdminProductVariant> {
  const { data } = await browserApi.post<AdminProductVariant>(
    `/admin/products/${productId}/variants/${variantId}/deactivate`,
    {
      expectedVersion,
    },
  );

  return data;
}

export async function deleteProductVariant(
  productId: string,
  variantId: string,
  expectedVersion: number,
): Promise<void> {
  await browserApi.delete(`/admin/products/${productId}/variants/${variantId}`, {
    params: {
      expectedVersion,
    },
  });
}
