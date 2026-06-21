// placeholder
import { browserApi } from '@/lib/http/browser-api';
import type {
  AdminCategoryOption,
  AdminProductDetail,
  AdminProductFilters,
  AdminProductsResponse,
} from '../types/admin-product';

export type CreateProductInput = {
  name: string;
  slug: string;
  categoryId: string | null;
  shortDescription: string | null;
  description: string | null;
};

export type UpdateProductInput = Partial<CreateProductInput> & {
  expectedVersion: number;
};

function createSearchParams(filters: AdminProductFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(filters.page));

  searchParams.set('limit', String(filters.limit));

  if (filters.search) {
    searchParams.set('search', filters.search);
  }

  if (filters.categoryId) {
    searchParams.set('categoryId', filters.categoryId);
  }

  if (filters.status) {
    searchParams.set('status', filters.status);
  }

  if (filters.sort) {
    searchParams.set('sort', filters.sort);
  }

  return searchParams;
}

export async function getAdminProducts(
  filters: AdminProductFilters,
  signal?: AbortSignal,
): Promise<AdminProductsResponse> {
  const searchParams = createSearchParams(filters);

  const { data } = await browserApi.get<AdminProductsResponse>(
    `/admin/products?${searchParams.toString()}`,
    {
      signal,
    },
  );

  return data;
}

export async function getAdminProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<AdminProductDetail> {
  const { data } = await browserApi.get<AdminProductDetail>(`/admin/products/${productId}`, {
    signal,
  });

  return data;
}

export async function createProduct(input: CreateProductInput): Promise<AdminProductDetail> {
  const { data } = await browserApi.post<AdminProductDetail>('/admin/products', input);

  return data;
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<AdminProductDetail> {
  const { data } = await browserApi.patch<AdminProductDetail>(
    `/admin/products/${productId}`,
    input,
  );

  return data;
}

export async function getAdminCategories(signal?: AbortSignal): Promise<AdminCategoryOption[]> {
  const { data } = await browserApi.get<{
    items: AdminCategoryOption[];
  }>('/admin/categories', {
    signal,
  });

  return data.items;
}
