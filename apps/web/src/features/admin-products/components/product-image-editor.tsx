'use client';
/* eslint-disable @next/next/no-img-element */

import { parseApiError } from '@/lib/http/api-error';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  useDeleteProductImage,
  useReorderProductImages,
  useSetPrimaryProductImage,
  useUpdateProductImage,
  useUploadProductImage,
} from '../hooks/use-product-image-mutations';
import { useProductImages } from '../hooks/use-product-images';
import type { AdminProductDetail, AdminProductImage } from '../types/admin-product';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

type ProductImageEditorProps = {
  product: AdminProductDetail;
};

type ProductsTranslator = ReturnType<typeof useTranslations>;

export function ProductImageEditor({ product }: ProductImageEditorProps) {
  const t = useTranslations('Admin.products');

  const imagesQuery = useProductImages(product.id);

  const uploadMutation = useUploadProductImage(product.id);

  const updateMutation = useUpdateProductImage(product.id);

  const primaryMutation = useSetPrimaryProductImage(product.id);

  const reorderMutation = useReorderProductImages(product.id);

  const deleteMutation = useDeleteProductImage(product.id);

  const images = imagesQuery.data;

  const [prevImages, setPrevImages] = useState<AdminProductImage[] | undefined>(images);
  const [orderedImages, setOrderedImages] = useState<AdminProductImage[]>(images ?? []);

  if (images !== prevImages) {
    setPrevImages(images);
    setOrderedImages(images ?? []);
  }

  const renderImages = images ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const archived = product.status === 'ARCHIVED';

  const busy =
    uploadMutation.isPending ||
    updateMutation.isPending ||
    primaryMutation.isPending ||
    reorderMutation.isPending ||
    deleteMutation.isPending;

  const mutationError =
    uploadMutation.error ??
    updateMutation.error ??
    primaryMutation.error ??
    reorderMutation.error ??
    deleteMutation.error;

  const parsedError = mutationError ? parseApiError(mutationError) : null;

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;

    if (!over || active.id === over.id || busy || archived) {
      return;
    }

    const oldIndex = orderedImages.findIndex((image) => image.id === active.id);

    const newIndex = orderedImages.findIndex((image) => image.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousImages = orderedImages;

    const nextImages = arrayMove(orderedImages, oldIndex, newIndex).map((image, index) => ({
      ...image,
      sortOrder: index,
    }));

    setOrderedImages(nextImages);

    try {
      await reorderMutation.mutateAsync({
        imageIds: nextImages.map((image) => image.id),

        expectedProductVersion: product.version,
      });
    } catch {
      setOrderedImages(previousImages);
    }
  }

  async function handleSetPrimary(image: AdminProductImage): Promise<void> {
    if (image.isPrimary) {
      return;
    }

    try {
      await primaryMutation.mutateAsync({
        imageId: image.id,

        expectedProductVersion: product.version,
      });
    } catch {
      // Hiển thị qua mutation state.
    }
  }

  async function handleUpdateAltText(
    image: AdminProductImage,
    altText: string | null,
  ): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        imageId: image.id,

        input: {
          altText,

          expectedProductVersion: product.version,
        },
      });
    } catch {
      // Hiển thị qua mutation state.
    }
  }

  async function handleDelete(image: AdminProductImage): Promise<void> {
    const confirmed = window.confirm(
      t('confirmDeleteImage', {
        name: image.altText ?? image.id,
      }),
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        imageId: image.id,

        expectedProductVersion: product.version,
      });
    } catch {
      // Hiển thị qua mutation state.
    }
  }

  return (
    <section>
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{t('imageSectionTitle')}</h2>

        <p className="mt-2 text-sm text-slate-500">{t('imageSectionDescription')}</p>
      </div>

      {archived ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('archivedImageNotice')}
        </div>
      ) : (
        <div className="mt-6">
          <ImageUploadPanel
            disabled={busy}
            nextSortOrder={renderImages.length}
            expectedProductVersion={product.version}
            t={t}
            onUpload={async (input) => {
              await uploadMutation.mutateAsync(input);
            }}
          />
        </div>
      )}

      {parsedError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getImageErrorMessage(parsedError.code, parsedError.message, t)}
        </div>
      ) : null}

      <div className="mt-7">
        {imagesQuery.isPending ? (
          <ImageGridSkeleton />
        ) : imagesQuery.isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          >
            {t('imageLoadError')}
          </div>
        ) : orderedImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h3 className="font-semibold text-slate-950">{t('noImagesTitle')}</h3>

            <p className="mt-2 text-sm text-slate-500">{t('noImagesDescription')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void handleDragEnd(event);
            }}
          >
            <SortableContext
              items={orderedImages.map((image) => image.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {orderedImages.map((image) => (
                  <SortableImageCard
                    key={image.id}
                    image={image}
                    disabled={busy || archived}
                    onSetPrimary={() => {
                      void handleSetPrimary(image);
                    }}
                    onUpdateAltText={(altText) => {
                      void handleUpdateAltText(image, altText);
                    }}
                    onDelete={() => {
                      void handleDelete(image);
                    }}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}

type UploadInput = {
  file: File;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  expectedProductVersion: number;
  onProgress?: (percentage: number) => void;
};

function ImageUploadPanel({
  disabled,
  nextSortOrder,
  expectedProductVersion,
  t,
  onUpload,
}: {
  disabled: boolean;
  nextSortOrder: number;
  expectedProductVersion: number;
  t: ProductsTranslator;
  onUpload: (input: UploadInput) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [altText, setAltText] = useState('');

  const [isPrimary, setIsPrimary] = useState(false);

  const [progress, setProgress] = useState(0);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function selectFile(selectedFile: File | null): void {
    setValidationError(null);
    setProgress(0);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!acceptedImageTypes.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl(null);

      setValidationError(t('imageTypeUnsupported'));

      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setPreviewUrl(null);

      setValidationError(t('imageTooLarge'));

      return;
    }

    setFile(selectedFile);

    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (!file) {
      setValidationError(t('imageRequired'));

      return;
    }

    setProgress(0);

    try {
      await onUpload({
        file,

        altText: altText.trim() || null,

        isPrimary,

        sortOrder: nextSortOrder,

        expectedProductVersion,

        onProgress: setProgress,
      });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(null);
      setPreviewUrl(null);
      setAltText('');
      setIsPrimary(false);
      setProgress(0);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch {
      // Mutation state hiển thị lỗi.
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <label className="flex min-h-52 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
          {previewUrl ? (
            <img src={previewUrl} alt={t('imagePreviewAlt')} className="size-full object-cover" />
          ) : (
            <div className="px-5 text-center">
              <p className="text-sm font-semibold text-slate-700">{t('selectImage')}</p>

              <p className="mt-2 text-xs text-slate-500">{t('imageRequirements')}</p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              selectFile(event.target.files?.[0] ?? null);
            }}
            className="sr-only"
          />
        </label>

        <div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Alt text</span>

            <input
              value={altText}
              maxLength={250}
              disabled={disabled}
              onChange={(event) => {
                setAltText(event.target.value);
              }}
              placeholder={t('altTextPlaceholder')}
              className={inputClass}
            />
          </label>

          <label className="mt-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={isPrimary}
              disabled={disabled}
              onChange={(event) => {
                setIsPrimary(event.target.checked);
              }}
              className="size-4 rounded border-slate-300"
            />

            <span className="text-sm text-slate-700">{t('setPrimaryCheckbox')}</span>
          </label>

          {validationError ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {validationError}
            </p>
          ) : null}

          {progress > 0 ? (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{t('uploading')}</span>

                <span>{progress}%</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-[width]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={disabled || !file}
            className="mt-6 h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('uploadImage')}
          </button>
        </div>
      </div>
    </form>
  );
}

function SortableImageCard({
  image,
  disabled,
  onSetPrimary,
  onUpdateAltText,
  onDelete,
  t,
}: {
  image: AdminProductImage;
  disabled: boolean;
  onSetPrimary: () => void;
  onUpdateAltText: (altText: string | null) => void;
  onDelete: () => void;
  t: ProductsTranslator;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled,
  });

  const [editing, setEditing] = useState(false);

  const [prevAltText, setPrevAltText] = useState(image.altText);
  const [altText, setAltText] = useState(image.altText ?? '');

  if (image.altText !== prevAltText) {
    setPrevAltText(image.altText);
    setAltText(image.altText ?? '');
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="relative aspect-square bg-slate-100">
        <img
          src={image.publicUrl}
          alt={image.altText ?? t('productImageAlt')}
          className="size-full object-cover"
        />

        {image.isPrimary ? (
          <span className="absolute left-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            {t('primary')}
          </span>
        ) : null}

        <button
          type="button"
          aria-label={t('dragImageAria')}
          disabled={disabled}
          {...attributes}
          {...listeners}
          className="absolute right-3 top-3 flex size-9 touch-none items-center justify-center rounded-lg bg-white/90 text-lg shadow-sm disabled:opacity-50"
        >
          ⠿
        </button>
      </div>

      <div className="p-4">
        {editing ? (
          <div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-slate-600">Alt text</span>

              <input
                value={altText}
                maxLength={250}
                className={inputClass}
                onChange={(event) => {
                  setAltText(event.target.value);
                }}
              />
            </label>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onUpdateAltText(altText.trim() || null);

                  setEditing(false);
                }}
                className={smallPrimaryButton}
              >
                {t('save')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAltText(image.altText ?? '');

                  setEditing(false);
                }}
                className={smallButton}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-slate-800">
              {image.altText || t('noAltText')}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatFileSize(image.sizeBytes)} · {image.contentType}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {t('sortOrder', {
                sortOrder: image.sortOrder,
              })}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setEditing(true);
                }}
                className={smallButton}
              >
                Alt text
              </button>

              {!image.isPrimary ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onSetPrimary}
                  className={smallButton}
                >
                  {t('setPrimary')}
                </button>
              ) : null}

              <button
                type="button"
                disabled={disabled}
                onClick={onDelete}
                className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 disabled:opacity-50"
              >
                {t('delete')}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ImageGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <div key={index} className="aspect-square animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageErrorMessage(code: string, fallback: string, t: ProductsTranslator): string {
  switch (code) {
    case 'PRODUCT_VERSION_CONFLICT':
      return t('productVersionConflictReload');

    case 'PRODUCT_IMAGE_FILE_TOO_LARGE':
      return t('imageTooLarge');

    case 'PRODUCT_IMAGE_TYPE_NOT_SUPPORTED':
      return t('imageTypeUnsupported');

    case 'PRODUCT_IMAGE_CONTENT_TYPE_MISMATCH':
      return t('imageContentTypeMismatch');

    case 'PRODUCT_IMAGE_STORAGE_UPLOAD_FAILED':
      return t('imageStorageUploadFailed');

    case 'ARCHIVED_PRODUCT_CANNOT_BE_MODIFIED':
      return t('archivedImageError');

    case 'PRODUCT_IMAGE_CONCURRENT_UPDATE':
      return t('imageConcurrentUpdate');

    default:
      return fallback;
  }
}

const inputClass = [
  'block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5',
  'text-sm text-slate-950 outline-none transition',
  'placeholder:text-slate-400',
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
  'disabled:cursor-not-allowed disabled:bg-slate-100',
].join(' ');

const smallButton = [
  'h-9 rounded-lg border border-slate-300 bg-white px-3',
  'text-xs font-semibold text-slate-700',
  'hover:bg-slate-50',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const smallPrimaryButton = [
  'h-9 rounded-lg bg-slate-950 px-3',
  'text-xs font-semibold text-white',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');
