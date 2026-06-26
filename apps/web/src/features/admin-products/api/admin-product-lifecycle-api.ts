import { browserApi } from '@/lib/http/browser-api';
import type { AdminProductDetail } from '../types/admin-product';

export type ProductLifecycleAction = 'publish' | 'unpublish' | 'archive';

export type ProductLifecycleInput = {
  productId: string;
  expectedVersion: number;
};

async function mutateProductLifecycle(
  action: ProductLifecycleAction,
  input: ProductLifecycleInput,
): Promise<AdminProductDetail> {
  const { data } = await browserApi.post<AdminProductDetail>(
    `/admin/products/${input.productId}/${action}`,
    {
      expectedVersion: input.expectedVersion,
    },
  );

  return data;
}

export function publishProduct(input: ProductLifecycleInput): Promise<AdminProductDetail> {
  return mutateProductLifecycle('publish', input);
}

export function unpublishProduct(input: ProductLifecycleInput): Promise<AdminProductDetail> {
  return mutateProductLifecycle('unpublish', input);
}

export function archiveProduct(input: ProductLifecycleInput): Promise<AdminProductDetail> {
  return mutateProductLifecycle('archive', input);
}
