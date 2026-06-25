'use client';

import { parseApiError } from '@/lib/http/api-error';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  useActivateProductVariant,
  useDeactivateProductVariant,
  useDeleteProductVariant,
} from '../hooks/use-product-variant-mutations';
import type { AdminProductDetail, AdminProductVariant } from '../types/admin-product';
import { VariantForm } from './variant-form';
import { VariantStatusBadge } from './variant-status-badge';

type ProductVariantEditorProps = {
  product: AdminProductDetail;
};

type ProductsTranslator = ReturnType<typeof useTranslations>;

export function ProductVariantEditor({ product }: ProductVariantEditorProps) {
  const t = useTranslations('Admin.products');
  const locale = useLocale();

  const [creating, setCreating] = useState(false);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const activateMutation = useActivateProductVariant(product.id);

  const deactivateMutation = useDeactivateProductVariant(product.id);

  const deleteMutation = useDeleteProductVariant(product.id);

  const archived = product.status === 'ARCHIVED';

  const actionMutation = activateMutation.error
    ? activateMutation
    : deactivateMutation.error
      ? deactivateMutation
      : deleteMutation.error
        ? deleteMutation
        : null;

  const actionError = actionMutation?.error ? parseApiError(actionMutation.error) : null;

  const actionPending =
    activateMutation.isPending || deactivateMutation.isPending || deleteMutation.isPending;

  async function handleActivate(variant: AdminProductVariant): Promise<void> {
    try {
      await activateMutation.mutateAsync({
        variantId: variant.id,

        expectedVersion: variant.version,
      });
    } catch {
      // Mutation state hiển thị lỗi.
    }
  }

  async function handleDeactivate(variant: AdminProductVariant): Promise<void> {
    try {
      await deactivateMutation.mutateAsync({
        variantId: variant.id,

        expectedVersion: variant.version,
      });
    } catch {
      // Mutation state hiển thị lỗi.
    }
  }

  async function handleDelete(variant: AdminProductVariant): Promise<void> {
    const confirmed = window.confirm(
      t('confirmDeleteVariant', {
        name: variant.name,
      }),
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        variantId: variant.id,

        expectedVersion: variant.version,
      });
    } catch {
      // Mutation state hiển thị lỗi.
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t('variantSectionTitle')}</h2>

          <p className="mt-2 text-sm text-slate-500">{t('variantSectionDescription')}</p>
        </div>

        {!archived ? (
          <button
            type="button"
            onClick={() => {
              setEditingVariantId(null);

              setCreating(true);
            }}
            disabled={creating || editingVariantId !== null}
            className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('addVariant')}
          </button>
        ) : null}
      </div>

      {archived ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('archivedVariantNotice')}
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getActionErrorMessage(actionError.code, actionError.message, t)}
        </div>
      ) : null}

      {creating ? (
        <div className="mt-6">
          <VariantForm
            productId={product.id}
            onCancel={() => {
              setCreating(false);
            }}
            onSaved={() => {
              setCreating(false);
            }}
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {product.variants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h3 className="font-semibold text-slate-950">{t('noVariantsTitle')}</h3>

            <p className="mt-2 text-sm text-slate-500">{t('noVariantsDescription')}</p>
          </div>
        ) : (
          product.variants.map((variant) => {
            const editing = editingVariantId === variant.id;

            if (editing) {
              return (
                <VariantForm
                  key={variant.id}
                  productId={product.id}
                  variant={variant}
                  disabled={archived}
                  onCancel={() => {
                    setEditingVariantId(null);
                  }}
                  onSaved={() => {
                    setEditingVariantId(null);
                  }}
                />
              );
            }

            return (
              <VariantCard
                key={variant.id}
                product={product}
                variant={variant}
                disabled={archived || actionPending}
                onEdit={() => {
                  setCreating(false);

                  setEditingVariantId(variant.id);
                }}
                onActivate={() => {
                  void handleActivate(variant);
                }}
                onDeactivate={() => {
                  void handleDeactivate(variant);
                }}
                onDelete={() => {
                  void handleDelete(variant);
                }}
                locale={locale}
                t={t}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function VariantCard({
  product,
  variant,
  disabled,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  locale,
  t,
}: {
  product: AdminProductDetail;
  variant: AdminProductVariant;
  disabled: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  locale: string;
  t: ProductsTranslator;
}) {
  const active = variant.status === 'ACTIVE';

  const cannotDeleteActivePublished = product.status === 'PUBLISHED' && active;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-slate-950">{variant.name}</h3>

            <VariantStatusBadge status={variant.status} />

            <span className="text-xs text-slate-400">
              {t('variantVersion', {
                version: variant.version,
              })}
            </span>
          </div>

          <p className="mt-2 font-mono text-sm text-slate-500">{variant.sku}</p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-lg font-semibold text-slate-950">
              {formatVnd(variant.priceAmount, locale)}
            </span>

            {variant.compareAtPrice !== null ? (
              <span className="text-sm text-slate-400 line-through">
                {formatVnd(variant.compareAtPrice, locale)}
              </span>
            ) : null}
          </div>

          {variant.attributes && Object.keys(variant.attributes).length > 0 ? (
            <dl className="mt-4 flex flex-wrap gap-2">
              {Object.entries(variant.attributes).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs">
                  <dt className="inline font-medium text-slate-500">{key}: </dt>

                  <dd className="inline text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="mt-4 text-xs text-slate-400">
            {t('sortOrder', {
              sortOrder: variant.sortOrder,
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className={secondaryButtonClass}
          >
            {t('edit')}
          </button>

          {active ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={disabled}
              className={secondaryButtonClass}
            >
              {t('deactivate')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              disabled={disabled}
              className={secondaryButtonClass}
            >
              {t('activate')}
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={disabled || cannotDeleteActivePublished}
            title={
              cannotDeleteActivePublished
                ? t('deactivateBeforeDeleteTitle')
                : undefined
            }
            className="h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </article>
  );
}

function formatVnd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getActionErrorMessage(
  code: string,
  fallback: string,
  t: ProductsTranslator,
): string {
  switch (code) {
    case 'PUBLISHED_PRODUCT_REQUIRES_ACTIVE_VARIANT':
      return t('publishedProductRequiresActiveVariant');

    case 'ACTIVE_PUBLISHED_VARIANT_CANNOT_BE_DELETED':
      return t('activePublishedVariantCannotBeDeleted');

    case 'PRODUCT_VARIANT_VERSION_CONFLICT':
      return t('variantConflict');

    case 'PRODUCT_VARIANT_STATUS_CONFLICT':
      return t('variantStatusConflict');

    default:
      return fallback;
  }
}

const secondaryButtonClass = [
  'h-10 rounded-lg border border-slate-300 bg-white px-4',
  'text-sm font-medium text-slate-700',
  'hover:bg-slate-50',
  'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');
