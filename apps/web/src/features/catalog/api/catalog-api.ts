import { browserApi } from '@/lib/http/browser-api';
import type {
  PublicCategoryTreeNode,
  PublicProductDetail,
  PublicProductFilters,
  PublicProductsResponse,
} from '../types/catalog';
function createProductSearchParams(filters: PublicProductFilters): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(filters.page));
  searchParams.set('limit', String(filters.limit));
  searchParams.set('sort', filters.sort);
  if (filters.search) {
    searchParams.set('search', filters.search);
  }
  if (filters.categorySlug) {
    searchParams.set('categorySlug', filters.categorySlug);
  }
  return searchParams;
}
export async function getPublicCategories(signal?: AbortSignal): Promise<PublicCategoryTreeNode[]> {
  const { data } = await browserApi.get<PublicCategoryTreeNode[]>('/catalog/categories', {
    signal,
  });
  return data;
}
export async function getPublicProducts(
  filters: PublicProductFilters,
  signal?: AbortSignal,
): Promise<PublicProductsResponse> {
  const searchParams = createProductSearchParams(filters);
  const { data } = await browserApi.get<PublicProductsResponse>(
    `/catalog/products?${searchParams.toString()}`,
    { signal },
  );
  return data;
}
export async function getPublicProduct(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicProductDetail> {
  const { data } = await browserApi.get<PublicProductDetail>(
    `/catalog/products/${encodeURIComponent(slug)}`,
    { signal },
  );
  return data;
}
