import { browserApi } from '@/lib/http/browser-api';
import type {
  AdminProductImage,
  DeleteProductImageResponse,
  ProductImageMutationResponse,
  ProductImageReorderResponse,
} from '../types/admin-product';

export type UploadProductImageInput = {
  file: File;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  expectedProductVersion: number;
  onProgress?: (percentage: number) => void;
};

export type UpdateProductImageInput = {
  altText?: string | null;
  sortOrder?: number;
  expectedProductVersion: number;
};

export async function getProductImages(
  productId: string,
  signal?: AbortSignal,
): Promise<AdminProductImage[]> {
  const { data } = await browserApi.get<AdminProductImage[]>(
    `/admin/products/${productId}/images`,
    {
      signal,
    },
  );

  return data;
}

export async function uploadProductImage(
  productId: string,
  input: UploadProductImageInput,
): Promise<ProductImageMutationResponse> {
  const formData = new FormData();

  formData.append('file', input.file);

  formData.append('altText', input.altText ?? '');

  formData.append('isPrimary', String(input.isPrimary));

  formData.append('sortOrder', String(input.sortOrder));

  formData.append('expectedProductVersion', String(input.expectedProductVersion));

  const { data } = await browserApi.post<ProductImageMutationResponse>(
    `/admin/products/${productId}/images`,
    formData,
    {
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total || !input.onProgress) {
          return;
        }

        const percentage = Math.min(
          100,
          Math.round((progressEvent.loaded / progressEvent.total) * 100),
        );

        input.onProgress(percentage);
      },
    },
  );

  return data;
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: UpdateProductImageInput,
): Promise<ProductImageMutationResponse> {
  const { data } = await browserApi.patch<ProductImageMutationResponse>(
    `/admin/products/${productId}/images/${imageId}`,
    input,
  );

  return data;
}

export async function setPrimaryProductImage(
  productId: string,
  imageId: string,
  expectedProductVersion: number,
): Promise<ProductImageMutationResponse> {
  const { data } = await browserApi.post<ProductImageMutationResponse>(
    `/admin/products/${productId}/images/${imageId}/primary`,
    {
      expectedProductVersion,
    },
  );

  return data;
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[],
  expectedProductVersion: number,
): Promise<ProductImageReorderResponse> {
  const { data } = await browserApi.put<ProductImageReorderResponse>(
    `/admin/products/${productId}/images/reorder`,
    {
      imageIds,
      expectedProductVersion,
    },
  );

  return data;
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  expectedProductVersion: number,
): Promise<DeleteProductImageResponse> {
  const { data } = await browserApi.delete<DeleteProductImageResponse>(
    `/admin/products/${productId}/images/${imageId}`,
    {
      params: {
        expectedProductVersion,
      },
    },
  );

  return data;
}
