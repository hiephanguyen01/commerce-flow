import { CatalogProductBrowser } from '@/features/catalog/components/catalog-product-browser';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sản phẩm | CommerceFlow',

  description: 'Khám phá danh mục sản phẩm tại CommerceFlow.',
};

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;

  return <CatalogProductBrowser locale={locale} />;
}
