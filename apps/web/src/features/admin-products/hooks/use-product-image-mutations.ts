'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  deleteProductImage,
  reorderProductImages,
  setPrimaryProductImage,
  updateProductImage,
  uploadProductImage,
  type UpdateProductImageInput,
  type UploadProductImageInput,
} from '../api/admin-product-images-api';
import type {
  AdminProductDetail,
  AdminProductImage,
  AdminProductImageSummary,
  ProductImageMutationResponse,
} from '../types/admin-product';
import { adminProductQueryKeys } from './admin-product-query-keys';

function sortImages(images: AdminProductImage[]): AdminProductImage[] {
  return [...images].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

function toImageSummary(image: AdminProductImage): AdminProductImageSummary {
  return {
    id: image.id,
    publicUrl: image.publicUrl,
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

function applyImageMutation(
  images: AdminProductImage[] | undefined,
  response: ProductImageMutationResponse,
): AdminProductImage[] {
  const currentImages = images ?? [];

  const normalizedImages = response.image.isPrimary
    ? currentImages.map((image) => ({
        ...image,
        isPrimary: image.id === response.image.id,
      }))
    : currentImages;

  const exists = normalizedImages.some((image) => image.id === response.image.id);

  const nextImages = exists
    ? normalizedImages.map((image) => (image.id === response.image.id ? response.image : image))
    : [...normalizedImages, response.image];

  return sortImages(nextImages);
}

function applyProductImageMutation(
  product: AdminProductDetail | undefined,
  response: ProductImageMutationResponse,
): AdminProductDetail | undefined {
  if (!product) {
    return product;
  }

  const incoming = toImageSummary(response.image);

  const normalizedImages = incoming.isPrimary
    ? product.images.map((image) => ({
        ...image,
        isPrimary: image.id === incoming.id,
      }))
    : product.images;

  const exists = normalizedImages.some((image) => image.id === incoming.id);

  const images = exists
    ? normalizedImages.map((image) => (image.id === incoming.id ? incoming : image))
    : [...normalizedImages, incoming];

  return {
    ...product,
    version: response.productVersion,
    images,
  };
}

function updateProductVersion(
  product: AdminProductDetail | undefined,
  productVersion: number,
): AdminProductDetail | undefined {
  if (!product) {
    return product;
  }

  return {
    ...product,
    version: productVersion,
  };
}

async function invalidateImageData(queryClient: QueryClient, productId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: adminProductQueryKeys.images(productId),
    }),

    queryClient.invalidateQueries({
      queryKey: adminProductQueryKeys.detail(productId),
      exact: true,
    }),

    queryClient.invalidateQueries({
      queryKey: adminProductQueryKeys.lists(),
    }),
  ]);
}

export function useUploadProductImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadProductImageInput) => uploadProductImage(productId, input),

    onSuccess: async (response) => {
      queryClient.setQueryData<AdminProductImage[]>(
        adminProductQueryKeys.images(productId),
        (current) => applyImageMutation(current, response),
      );

      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => applyProductImageMutation(current, response),
      );

      await invalidateImageData(queryClient, productId);
    },
  });
}

export function useUpdateProductImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, input }: { imageId: string; input: UpdateProductImageInput }) =>
      updateProductImage(productId, imageId, input),

    onSuccess: async (response) => {
      queryClient.setQueryData<AdminProductImage[]>(
        adminProductQueryKeys.images(productId),
        (current) => applyImageMutation(current, response),
      );

      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => applyProductImageMutation(current, response),
      );

      await invalidateImageData(queryClient, productId);
    },
  });
}

export function useSetPrimaryProductImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageId,
      expectedProductVersion,
    }: {
      imageId: string;
      expectedProductVersion: number;
    }) => setPrimaryProductImage(productId, imageId, expectedProductVersion),

    onSuccess: async (response) => {
      queryClient.setQueryData<AdminProductImage[]>(
        adminProductQueryKeys.images(productId),
        (current) => applyImageMutation(current, response),
      );

      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => applyProductImageMutation(current, response),
      );

      await invalidateImageData(queryClient, productId);
    },
  });
}

export function useReorderProductImages(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageIds,
      expectedProductVersion,
    }: {
      imageIds: string[];
      expectedProductVersion: number;
    }) => reorderProductImages(productId, imageIds, expectedProductVersion),

    onSuccess: async (response) => {
      queryClient.setQueryData(adminProductQueryKeys.images(productId), response.images);

      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            version: response.productVersion,
            images: response.images.map(toImageSummary),
          };
        },
      );

      await invalidateImageData(queryClient, productId);
    },
  });
}

export function useDeleteProductImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageId,
      expectedProductVersion,
    }: {
      imageId: string;
      expectedProductVersion: number;
    }) => deleteProductImage(productId, imageId, expectedProductVersion),

    onSuccess: async (response, variables) => {
      queryClient.setQueryData<AdminProductImage[]>(
        adminProductQueryKeys.images(productId),
        (current) => current?.filter((image) => image.id !== variables.imageId) ?? [],
      );

      queryClient.setQueryData<AdminProductDetail>(
        adminProductQueryKeys.detail(productId),
        (current) => {
          const updated = updateProductVersion(current, response.productVersion);

          if (!updated) {
            return updated;
          }

          return {
            ...updated,
            images: updated.images.filter((image) => image.id !== variables.imageId),
          };
        },
      );

      /*
       * Backend có thể tự chọn primary mới,
       * vì vậy bắt buộc refetch sau delete.
       */
      await invalidateImageData(queryClient, productId);
    },
  });
}
