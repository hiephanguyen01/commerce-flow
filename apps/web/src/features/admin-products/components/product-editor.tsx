'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAdminProduct } from '../hooks/use-admin-product';
import { ProductForm } from './product-form';
import { ProductImageEditor } from './product-image-editor';
import { ProductLifecyclePanel } from './product-lifecycle-panel';
import { ProductStatusBadge } from './product-status-badge';
import { ProductVariantEditor } from './product-variant-editor';

type ProductEditorProps = {
  locale: string;
  productId: string;
};

type ProductEditorTab = 'information' | 'variants' | 'images';

export function ProductEditor({ locale, productId }: ProductEditorProps) {
  const t = useTranslations('Admin.products');
  const [activeTab, setActiveTab] = useState<ProductEditorTab>('information');

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
        {t('detailLoadError')}
      </div>
    );
  }

  const product = productQuery.data;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{product.name}</h1>

            <ProductStatusBadge status={product.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">Product version {product.version}</p>

          {product.publishedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              Published: {formatDateTime(product.publishedAt)}
            </p>
          ) : null}

          {product.archivedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              Archived: {formatDateTime(product.archivedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-7">
        <ProductLifecyclePanel product={product} />
      </div>

      <nav
        aria-label="Product editor"
        className="mt-7 flex overflow-x-auto border-b border-slate-200"
      >
        {/* tabs */}
        <TabButton
          active={activeTab === 'information'}
          onClick={() => {
            setActiveTab('information');
          }}
        >
          {t('informationTab')}
        </TabButton>

        <TabButton
          active={activeTab === 'variants'}
          onClick={() => {
            setActiveTab('variants');
          }}
        >
          {t('variantsTab', {
            count: product.variants.length,
          })}
        </TabButton>

        <TabButton
          active={activeTab === 'images'}
          onClick={() => {
            setActiveTab('images');
          }}
        >
          {t('imagesTab', {
            count: product.images.length,
          })}
        </TabButton>
      </nav>

      <div className="mt-7">
        <div className="mt-7">
          {activeTab === 'information' ? (
            <ProductForm
              key={`${product.id}:${product.version}`}
              locale={locale}
              product={product}
              disabled={product.status === 'ARCHIVED'}
            />
          ) : null}

          {activeTab === 'variants' ? <ProductVariantEditor product={product} /> : null}

          {activeTab === 'images' ? <ProductImageEditor product={product} /> : null}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition',
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-950',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
