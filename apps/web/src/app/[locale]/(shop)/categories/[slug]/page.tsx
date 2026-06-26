import { CatalogProductBrowser } from '@/features/catalog/components/catalog-product-browser';
import { Suspense } from 'react';

type CategoryPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;

  return (
    <Suspense fallback={<div>Đang tải sản phẩm...</div>}>
      <CatalogProductBrowser locale={locale} initialCategorySlug={slug} />
    </Suspense>
  );
}
