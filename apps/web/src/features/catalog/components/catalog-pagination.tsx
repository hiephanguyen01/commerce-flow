'use client';
type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};
export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }
  const pages = createPageRange(page, totalPages);
  return (
    <nav
      aria-label="Phân trang sản phẩm"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {' '}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
        className={buttonClass}
      >
        {' '}
        Trước{' '}
      </button>{' '}
      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          aria-current={pageNumber === page ? 'page' : undefined}
          onClick={() => {
            onPageChange(pageNumber);
          }}
          className={[
            buttonClass,
            pageNumber === page ? 'border-slate-950 bg-slate-950 text-white' : '',
          ].join(' ')}
        >
          {' '}
          {pageNumber}{' '}
        </button>
      ))}{' '}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
        className={buttonClass}
      >
        {' '}
        Sau{' '}
      </button>{' '}
    </nav>
  );
}
function createPageRange(currentPage: number, totalPages: number): number[] {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
const buttonClass = [
  'min-w-10 rounded-lg border border-slate-300 bg-white px-3 py-2',
  'text-sm font-medium text-slate-700',
  'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');
