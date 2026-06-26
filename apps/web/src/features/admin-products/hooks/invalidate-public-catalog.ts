import { catalogQueryKeys } from '@/features/catalog/hooks/catalog-query-keys';
import type { QueryClient } from '@tanstack/react-query';

export async function invalidatePublicCatalog(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: catalogQueryKeys.all,
  });
}
