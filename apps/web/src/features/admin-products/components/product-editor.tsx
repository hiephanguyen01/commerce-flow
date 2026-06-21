'use client';

import { useAdminProduct } from '../hooks/use-admin-product';
import { ProductForm } from './product-form';
import { ProductStatusBadge } from './product-status-badge';

type ProductEditorProps = {
  locale: string;
  productId: string;
};

export function ProductEditor({ locale, productId }: ProductEditorProps) {
  const productQuery = useAdminProduct(productId);

  if (productQuery.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Không thể tải sản phẩm.
      </div>
    );
  }

  const product = productQuery.data;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{product.name}</h1>

            <ProductStatusBadge status={product.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">Version {product.version}</p>
        </div>
      </div>

      <nav className="mt-7 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          className="border-b-2 border-indigo-600 px-4 py-3 text-sm font-semibold text-indigo-600"
        >
          Thông tin
        </button>

        <button type="button" disabled className="px-4 py-3 text-sm text-slate-400">
          Biến thể ({product.variants.length})
        </button>

        <button type="button" disabled className="px-4 py-3 text-sm text-slate-400">
          Hình ảnh ({product.images.length})
        </button>
      </nav>

      <div className="mt-7">
        <ProductForm key={`${product.id}:${product.version}`} locale={locale} product={product} />
      </div>
    </div>
  );
}
