import { AdminProductList } from '@/features/admin-products/components/admin-product-list';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

type AdminProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: AdminProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'Admin.products',
  });

  return {
    title: t('metadataTitle'),
  };
}

export default async function AdminProductsPage({ params }: AdminProductsPageProps) {
  const { locale } = await params;

  return <AdminProductList locale={locale} />;
}
