import { ProductForm } from '@/features/admin-products/components/product-form';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type NewProductPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { locale } = await params;
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
        <p className="text-sm font-medium text-indigo-600">{t('eyebrow')}</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          {t('newTitle')}
        </h1>

        <p className="mt-2 text-sm text-slate-500">{t('newDescription')}</p>
      </div>

      <div className="mt-8">
        <ProductForm locale={locale} />
      </div>
    </div>
  );
}
