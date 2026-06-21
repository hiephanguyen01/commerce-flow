import { AdminProductList } from '@/features/admin-products/components/admin-product-list';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý sản phẩm | CommerceFlow',
};

type AdminProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminProductsPage({ params }: AdminProductsPageProps) {
  const { locale } = await params;

  return <AdminProductList locale={locale} />;
}
