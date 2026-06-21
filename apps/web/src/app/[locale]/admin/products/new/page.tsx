import { ProductForm } from '@/features/admin-products/components/product-form';
import Link from 'next/link';

type NewProductPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/${locale}/admin/products`}
        className="text-sm font-medium text-slate-500 hover:text-slate-950"
      >
        ← Quay lại danh sách
      </Link>

      <div className="mt-5">
        <p className="text-sm font-medium text-indigo-600">Catalog</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Tạo sản phẩm</h1>

        <p className="mt-2 text-sm text-slate-500">
          Sản phẩm mới sẽ được tạo ở trạng thái bản nháp.
        </p>
      </div>

      <div className="mt-8">
        <ProductForm locale={locale} />
      </div>
    </div>
  );
}
