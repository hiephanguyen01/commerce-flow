import { ProductEditor } from '@/features/admin-products/components/product-editor';
import Link from 'next/link';

type ProductDetailPageProps = {
  params: Promise<{
    locale: string;
    productId: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, productId } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/${locale}/admin/products`}
        className="text-sm font-medium text-slate-500 hover:text-slate-950"
      >
        ← Quay lại danh sách
      </Link>

      <div className="mt-5">
        <ProductEditor locale={locale} productId={productId} />
      </div>
    </div>
  );
}
