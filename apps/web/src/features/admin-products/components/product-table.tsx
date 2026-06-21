'use client';

import Link from 'next/link';
import type { AdminProductListItem } from '../types/admin-product';
import { ProductStatusBadge } from './product-status-badge';

type ProductTableProps = {
  locale: string;
  products: AdminProductListItem[];
};

export function ProductTable({ locale, products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold text-slate-950">Không tìm thấy sản phẩm</h2>

        <p className="mt-2 text-sm text-slate-500">Thay đổi bộ lọc hoặc tạo sản phẩm đầu tiên.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Sản phẩm</TableHeader>

              <TableHeader>Trạng thái</TableHeader>

              <TableHeader>Giá thấp nhất</TableHeader>

              <TableHeader>Biến thể</TableHeader>

              <TableHeader>Cập nhật</TableHeader>

              <TableHeader>
                <span className="sr-only">Thao tác</span>
              </TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const image = product.images[0];

              const variant = product.variants[0];

              return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex min-w-64 items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {image ? (
                          // Dùng img trước khi cấu hình remotePatterns.
                          // Sau đó có thể chuyển sang next/image.
                          <img
                            src={image.publicUrl}
                            alt={image.altText ?? product.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">No image</span>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-slate-950">{product.name}</p>

                        <p className="mt-1 text-xs text-slate-500">{product.slug}</p>

                        {product.category ? (
                          <p className="mt-1 text-xs text-indigo-600">{product.category.name}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <ProductStatusBadge status={product.status} />
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                    {variant ? formatPrice(variant.priceAmount, variant.currency) : 'Chưa có giá'}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {product._count.variants}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(product.updatedAt))}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <Link
                      href={`/${locale}/admin/products/${product.id}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Chỉnh sửa
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
