'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminProducts } from '../hooks/use-admin-products';
import type { AdminProductFilters, ProductStatus } from '../types/admin-product';
import { ProductTable } from './product-table';

type AdminProductListProps = {
  locale: string;
};

export function AdminProductList({ locale }: AdminProductListProps) {
  const t = useTranslations('Admin.products');
  const statusT = useTranslations('Admin.productStatus');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: AdminProductFilters = {
    page: Math.max(1, Number(searchParams.get('page') ?? '1')),

    limit: 20,

    search: searchParams.get('search') || undefined,

    status: (searchParams.get('status') as ProductStatus | null) ?? undefined,

    sort: (searchParams.get('sort') as AdminProductFilters['sort'] | null) ?? 'newest',
  };

  const productsQuery = useAdminProducts(filters);

  function updateFilter(name: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    if (name !== 'page') {
      params.set('page', '1');
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  const data = productsQuery.data;

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">{t('eyebrow')}</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {t('title')}
          </h1>

          <p className="mt-2 text-sm text-slate-500">{t('description')}</p>
        </div>

        <Link
          href={`/${locale}/admin/products/new`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t('create')}
        </Link>
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_180px]">
        <input
          type="search"
          defaultValue={filters.search ?? ''}
          placeholder={t('searchPlaceholder')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              updateFilter('search', event.currentTarget.value.trim());
            }
          }}
          className="h-11 rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <select
          value={filters.status ?? ''}
          onChange={(event) => {
            updateFilter('status', event.target.value);
          }}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="DRAFT">{statusT('DRAFT')}</option>
          <option value="PUBLISHED">{statusT('PUBLISHED')}</option>
          <option value="ARCHIVED">{statusT('ARCHIVED')}</option>
        </select>

        <select
          value={filters.sort ?? 'newest'}
          onChange={(event) => {
            updateFilter('sort', event.target.value);
          }}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="newest">{t('sortNewest')}</option>
          <option value="updated_desc">{t('sortRecentlyUpdated')}</option>
          <option value="name_asc">{t('sortNameAsc')}</option>
          <option value="name_desc">{t('sortNameDesc')}</option>
        </select>
      </div>

      <div className="mt-5">
        {productsQuery.isPending ? (
          <ProductTableSkeleton />
        ) : productsQuery.isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          >
            {t('loadError')}
          </div>
        ) : (
          <ProductTable locale={locale} products={data?.items ?? []} />
        )}
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t('pageInfo', {
              page: data.pagination.page,
              totalPages: data.pagination.totalPages,
            })}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={data.pagination.page <= 1}
              onClick={() => {
                updateFilter('page', String(data.pagination.page - 1));
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              {t('previous')}
            </button>

            <button
              type="button"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => {
                updateFilter('page', String(data.pagination.page + 1));
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              {t('next')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductTableSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
