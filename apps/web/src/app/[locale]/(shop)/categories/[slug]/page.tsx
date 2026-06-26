import { CatalogProductBrowser } from '@/features/catalog/components/catalog-product-browser';

type CategoryPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;

  return <CatalogProductBrowser locale={locale} initialCategorySlug={slug} />;
}
