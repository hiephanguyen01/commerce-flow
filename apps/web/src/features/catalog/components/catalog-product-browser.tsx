'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { usePublicCategories } from '../hooks/use-public-categories';
import { usePublicProducts } from '../hooks/use-public-products';
import type {
  PublicCategoryTreeNode,
  PublicProductFilters,
  PublicProductSort,
} from '../types/catalog';
import { CatalogPagination } from './catalog-pagination';
import { CatalogProductFilters } from './catalog-product-filters';
import { CatalogProductGrid } from './catalog-product-grid';
type CatalogProductBrowserProps = { locale: string; initialCategorySlug?: string };
export function CatalogProductBrowser({ locale, initialCategorySlug }: CatalogProductBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo<PublicProductFilters>(
    () => ({
      page: parsePositiveInteger(searchParams.get('page'), 1),
      limit: 20,
      search: searchParams.get('search')?.trim() || undefined,
      categorySlug: initialCategorySlug ?? searchParams.get('categorySlug')?.trim() ?? undefined,
      sort: parseSort(searchParams.get('sort')),
    }),
    [initialCategorySlug, searchParams],
  );
  const productsQuery = usePublicProducts(filters);
  const categoriesQuery = usePublicCategories();
  const categories = flattenCategories(categoriesQuery.data ?? []);
  function updateFilters(updates: Record<string, string | null>): void {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    if (!('page' in updates)) {
      next.set('page', '1');
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: true });
  }
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      {' '}
      <header>
        {' '}
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          {' '}
          CommerceFlow Catalog{' '}
        </p>{' '}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {' '}
          Khám phá sản phẩm{' '}
        </h1>{' '}
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {' '}
          Tìm kiếm sản phẩm và lựa chọn biến thể phù hợp.{' '}
        </p>{' '}
      </header>{' '}
      <div className="mt-8">
        {' '}
        <CatalogProductFilters
          search={filters.search ?? ''}
          categorySlug={filters.categorySlug ?? ''}
          sort={filters.sort}
          categories={categories}
          categoriesPending={categoriesQuery.isPending}
          onSearch={(search) => {
            updateFilters({ search: search.trim() || null });
          }}
          onCategoryChange={(categorySlug) => {
            updateFilters({ categorySlug: categorySlug || null });
          }}
          onSortChange={(sort) => {
            updateFilters({ sort });
          }}
          onReset={() => {
            router.replace(pathname);
          }}
        />{' '}
      </div>{' '}
      <div className="mt-8">
        {' '}
        {productsQuery.isPending ? (
          <CatalogGridSkeleton />
        ) : productsQuery.isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          >
            {' '}
            Không thể tải danh sách sản phẩm.{' '}
          </div>
        ) : (
          <>
            {' '}
            <div className="mb-5 flex items-center justify-between">
              {' '}
              <p className="text-sm text-slate-500">
                {' '}
                {productsQuery.data.pagination.total} sản phẩm{' '}
              </p>{' '}
              {productsQuery.isFetching ? (
                <span className="text-xs text-slate-400"> Đang cập nhật... </span>
              ) : null}{' '}
            </div>{' '}
            <CatalogProductGrid locale={locale} products={productsQuery.data.items} />{' '}
            <CatalogPagination
              page={productsQuery.data.pagination.page}
              totalPages={productsQuery.data.pagination.totalPages}
              onPageChange={(page) => {
                updateFilters({ page: String(page) });
              }}
            />{' '}
          </>
        )}{' '}
      </div>{' '}
    </main>
  );
}
function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function parseSort(value: string | null): PublicProductSort {
  switch (value) {
    case 'name_asc':
    case 'name_desc':
      return value;
    case 'newest':
    default:
      return 'newest';
  }
}
function flattenCategories(
  categories: PublicCategoryTreeNode[],
  depth = 0,
): Array<PublicCategoryTreeNode & { depth: number }> {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children, depth + 1),
  ]);
}
function CatalogGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {' '}
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {' '}
          <div className="aspect-square animate-pulse bg-slate-200" />{' '}
          <div className="space-y-3 p-5">
            {' '}
            <div className="h-4 animate-pulse rounded bg-slate-200" />{' '}
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />{' '}
          </div>{' '}
        </div>
      ))}{' '}
    </div>
  );
}
