import { ProductEditor } from '@/features/admin-products/components/product-editor';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type ProductDetailPageProps = {
  params: Promise<{
    locale: string;
    productId: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, productId } = await params;
  const t = await getTranslations('Admin.products');

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/${locale}/admin/products`}
        className="text-sm font-medium text-slate-500 hover:text-slate-950"
      >
        {t('backToList')}
      </Link>

      <div className="mt-5">
        <ProductEditor locale={locale} productId={productId} />
      </div>
    </div>
  );
}
