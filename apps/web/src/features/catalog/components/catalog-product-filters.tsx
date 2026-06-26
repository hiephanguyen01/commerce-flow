'use client';
import { useState, type FormEvent } from 'react';
import type { PublicCategoryTreeNode, PublicProductSort } from '../types/catalog';
type CategoryOption = PublicCategoryTreeNode & { depth: number };
type CatalogProductFiltersProps = {
  search: string;
  categorySlug: string;
  sort: PublicProductSort;
  categories: CategoryOption[];
  categoriesPending: boolean;
  onSearch: (search: string) => void;
  onCategoryChange: (categorySlug: string) => void;
  onSortChange: (sort: PublicProductSort) => void;
  onReset: () => void;
};
export function CatalogProductFilters({
  search,
  categorySlug,
  sort,
  categories,
  categoriesPending,
  onSearch,
  onCategoryChange,
  onSortChange,
  onReset,
}: CatalogProductFiltersProps) {
  const [prevSearch, setPrevSearch] = useState(search);
  const [searchValue, setSearchValue] = useState(search);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchValue(search);
  }
  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSearch(searchValue);
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_240px_190px_auto]"
    >
      {' '}
      <div className="flex">
        {' '}
        <input
          type="search"
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
          }}
          placeholder="Tìm kiếm sản phẩm..."
          className="h-11 min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-300 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />{' '}
        <button
          type="submit"
          className="h-11 rounded-r-xl bg-slate-950 px-5 text-sm font-semibold text-white"
        >
          {' '}
          Tìm{' '}
        </button>{' '}
      </div>{' '}
      <select
        value={categorySlug}
        disabled={categoriesPending}
        onChange={(event) => {
          onCategoryChange(event.target.value);
        }}
        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
      >
        {' '}
        <option value=""> Tất cả danh mục </option>{' '}
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {' '}
            {'— '.repeat(category.depth)} {category.name}{' '}
          </option>
        ))}{' '}
      </select>{' '}
      <select
        value={sort}
        onChange={(event) => {
          onSortChange(event.target.value as PublicProductSort);
        }}
        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
      >
        {' '}
        <option value="newest"> Mới nhất </option> <option value="name_asc"> Tên A–Z </option>{' '}
        <option value="name_desc"> Tên Z–A </option>{' '}
      </select>{' '}
      <button
        type="button"
        onClick={onReset}
        className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
      >
        {' '}
        Đặt lại{' '}
      </button>{' '}
    </form>
  );
}
