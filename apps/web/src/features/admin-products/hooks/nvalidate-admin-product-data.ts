import { catalogQueryKeys } from '@/features/catalog/hooks/catalog-query-keys';
import type { QueryClient } from '@tanstack/react-query';
import { adminProductQueryKeys } from './admin-product-query-keys';

type InvalidateAdminProductDataOptions = {
  invalidateDetail?: boolean;
  invalidateImages?: boolean;
  invalidatePublicCatalog?: boolean;
};

export async function invalidateAdminProductData(
  queryClient: QueryClient,
  productId: string,
  options: InvalidateAdminProductDataOptions = {},
): Promise<void> {
  const {
    invalidateDetail = true,
    invalidateImages = false,
    invalidatePublicCatalog = true,
  } = options;

  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({
      queryKey: adminProductQueryKeys.lists(),
    }),
  ];

  if (invalidateDetail) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: adminProductQueryKeys.detail(productId),
        exact: true,
      }),
    );
  }

  if (invalidateImages) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: adminProductQueryKeys.images(productId),
      }),
    );
  }

  if (invalidatePublicCatalog) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: catalogQueryKeys.all,
      }),
    );
  }

  await Promise.all(invalidations);
}
