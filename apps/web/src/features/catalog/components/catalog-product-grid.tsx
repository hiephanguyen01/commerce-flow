import type { PublicProductListItem } from '../types/catalog';
import { CatalogProductCard } from './catalog-product-card';
type CatalogProductGridProps = { locale: string; products: PublicProductListItem[] };
export function CatalogProductGrid({ locale, products }: CatalogProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        {' '}
        <h2 className="font-semibold text-slate-950"> Không tìm thấy sản phẩm </h2>{' '}
        <p className="mt-2 text-sm text-slate-500">
          {' '}
          Hãy thay đổi từ khóa hoặc bộ lọc danh mục.{' '}
        </p>{' '}
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {' '}
      {products.map((product) => (
        <CatalogProductCard key={product.id} locale={locale} product={product} />
      ))}{' '}
    </div>
  );
}
