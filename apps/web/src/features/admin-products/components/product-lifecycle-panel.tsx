'use client';

import { parseApiError } from '@/lib/http/api-error';
import {
  useArchiveProduct,
  usePublishProduct,
  useUnpublishProduct,
} from '../hooks/use-product-lifecycle';
import type { AdminProductDetail } from '../types/admin-product';

type ProductLifecyclePanelProps = {
  product: AdminProductDetail;
};

export function ProductLifecyclePanel({ product }: ProductLifecyclePanelProps) {
  const publishMutation = usePublishProduct();

  const unpublishMutation = useUnpublishProduct();

  const archiveMutation = useArchiveProduct();

  const activeVariantCount = product.variants.filter(
    (variant) => variant.status === 'ACTIVE',
  ).length;

  const hasPrimaryImage = product.images.some((image) => image.isPrimary);

  const publishReady = activeVariantCount > 0;

  const busy =
    publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending;

  const mutationError = publishMutation.error ?? unpublishMutation.error ?? archiveMutation.error;

  const parsedError = mutationError ? parseApiError(mutationError) : null;

  async function handlePublish(): Promise<void> {
    if (!publishReady) {
      return;
    }

    const confirmed = window.confirm(`Xuất bản sản phẩm "${product.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await publishMutation.mutateAsync({
        productId: product.id,
        expectedVersion: product.version,
      });
    } catch {
      // Hiển thị bằng mutation state.
    }
  }

  async function handleUnpublish(): Promise<void> {
    const confirmed = window.confirm(
      `Chuyển sản phẩm "${product.name}" về bản nháp? Sản phẩm sẽ không còn xuất hiện trên storefront.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await unpublishMutation.mutateAsync({
        productId: product.id,
        expectedVersion: product.version,
      });
    } catch {
      // Hiển thị bằng mutation state.
    }
  }

  async function handleArchive(): Promise<void> {
    const confirmed = window.confirm(
      `Lưu trữ sản phẩm "${product.name}"? Sau khi lưu trữ, sản phẩm không thể chỉnh sửa trong Sprint 3.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await archiveMutation.mutateAsync({
        productId: product.id,
        expectedVersion: product.version,
      });
    } catch {
      // Hiển thị bằng mutation state.
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Trạng thái sản phẩm</h2>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý việc xuất bản và lưu trữ sản phẩm trên storefront.
          </p>
        </div>

        <LifecycleActions
          product={product}
          publishReady={publishReady}
          busy={busy}
          onPublish={() => {
            void handlePublish();
          }}
          onUnpublish={() => {
            void handleUnpublish();
          }}
          onArchive={() => {
            void handleArchive();
          }}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <LifecycleCheck
          valid={activeVariantCount > 0}
          label="Active variant"
          description={
            activeVariantCount > 0
              ? `${activeVariantCount} variant đang hoạt động`
              : 'Cần ít nhất một active variant'
          }
          required
        />

        <LifecycleCheck
          valid={product.images.length > 0}
          label="Hình ảnh"
          description={
            product.images.length > 0
              ? `${product.images.length} hình ảnh`
              : 'Sản phẩm chưa có hình ảnh'
          }
        />

        <LifecycleCheck
          valid={hasPrimaryImage}
          label="Ảnh primary"
          description={hasPrimaryImage ? 'Đã có ảnh primary' : 'Chưa có ảnh primary'}
        />
      </div>

      {product.status === 'DRAFT' && !publishReady ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Sản phẩm chưa sẵn sàng để publish</p>

          <p className="mt-1 text-sm text-amber-700">
            Hãy tạo hoặc kích hoạt ít nhất một biến thể.
          </p>
        </div>
      ) : null}

      {product.status === 'DRAFT' && publishReady && !hasPrimaryImage ? (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            Có thể publish nhưng chưa có ảnh primary
          </p>

          <p className="mt-1 text-sm text-blue-700">
            Backend hiện không bắt buộc ảnh, nhưng storefront sẽ hiển thị sản phẩm kém hoàn chỉnh.
          </p>
        </div>
      ) : null}

      {product.status === 'PUBLISHED' ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Sản phẩm đang được xuất bản</p>

          <p className="mt-1 text-sm text-emerald-700">
            Sản phẩm có thể xuất hiện trên catalog public nếu category đang active.
          </p>
        </div>
      ) : null}

      {product.status === 'ARCHIVED' ? (
        <div className="mt-5 rounded-xl border border-slate-300 bg-slate-100 p-4">
          <p className="text-sm font-medium text-slate-900">Sản phẩm đã được lưu trữ</p>

          <p className="mt-1 text-sm text-slate-600">
            Không thể cập nhật thông tin, variant hoặc hình ảnh của sản phẩm này.
          </p>
        </div>
      ) : null}

      {parsedError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getLifecycleErrorMessage(parsedError.code, parsedError.message)}
        </div>
      ) : null}
    </section>
  );
}

function LifecycleActions({
  product,
  publishReady,
  busy,
  onPublish,
  onUnpublish,
  onArchive,
}: {
  product: AdminProductDetail;
  publishReady: boolean;
  busy: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}) {
  switch (product.status) {
    case 'DRAFT':
      return (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPublish}
            disabled={busy || !publishReady}
            title={!publishReady ? 'Product cần ít nhất một active variant' : undefined}
            className={primaryButtonClass}
          >
            {busy ? 'Đang xử lý...' : 'Publish'}
          </button>

          <button type="button" onClick={onArchive} disabled={busy} className={dangerButtonClass}>
            Archive
          </button>
        </div>
      );

    case 'PUBLISHED':
      return (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onUnpublish}
            disabled={busy}
            className={secondaryButtonClass}
          >
            {busy ? 'Đang xử lý...' : 'Unpublish'}
          </button>

          <button type="button" onClick={onArchive} disabled={busy} className={dangerButtonClass}>
            Archive
          </button>
        </div>
      );

    case 'ARCHIVED':
      return (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300">
          Read only
        </span>
      );
  }
}

function LifecycleCheck({
  valid,
  label,
  description,
  required = false,
}: {
  valid: boolean;
  label: string;
  description: string;
  required?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-xl border p-4',
        valid
          ? 'border-emerald-200 bg-emerald-50'
          : required
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={[
            'flex size-5 items-center justify-center rounded-full text-xs font-bold',
            valid
              ? 'bg-emerald-600 text-white'
              : required
                ? 'bg-red-600 text-white'
                : 'bg-amber-500 text-white',
          ].join(' ')}
        >
          {valid ? '✓' : '!'}
        </span>

        <p className="text-sm font-semibold text-slate-900">
          {label}

          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </p>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function getLifecycleErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'PRODUCT_REQUIRES_ACTIVE_VARIANT':
      return 'Product cần ít nhất một active variant trước khi publish.';

    case 'PRODUCT_CANNOT_BE_PUBLISHED':
      return 'Chỉ sản phẩm DRAFT mới có thể được publish.';

    case 'PRODUCT_CANNOT_BE_UNPUBLISHED':
      return 'Chỉ sản phẩm PUBLISHED mới có thể chuyển về bản nháp.';

    case 'PRODUCT_ALREADY_ARCHIVED':
      return 'Sản phẩm đã được lưu trữ.';

    case 'PRODUCT_VERSION_CONFLICT':
      return 'Sản phẩm đã được thay đổi bởi một yêu cầu khác. Hãy tải lại dữ liệu trước khi tiếp tục.';

    case 'ARCHIVED_PRODUCT_CANNOT_BE_UPDATED':
      return 'Không thể cập nhật sản phẩm đã lưu trữ.';

    default:
      return fallback;
  }
}

const primaryButtonClass = [
  'inline-flex h-11 items-center justify-center rounded-xl',
  'bg-emerald-600 px-5 text-sm font-semibold text-white',
  'transition hover:bg-emerald-500',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const secondaryButtonClass = [
  'inline-flex h-11 items-center justify-center rounded-xl',
  'border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700',
  'transition hover:bg-slate-50',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const dangerButtonClass = [
  'inline-flex h-11 items-center justify-center rounded-xl',
  'border border-red-200 bg-white px-5 text-sm font-semibold text-red-600',
  'transition hover:bg-red-50',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');
