import { CatalogProductDetail } from '@/features/catalog/components/catalog-product-detail';
import type { Metadata } from 'next';

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `${slug.replaceAll('-', ' ')} | CommerceFlow`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;

  return <CatalogProductDetail locale={locale} slug={slug} />;
}
