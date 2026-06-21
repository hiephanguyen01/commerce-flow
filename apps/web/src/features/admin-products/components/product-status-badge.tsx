// placeholder
import type { ProductStatus } from '../types/admin-product';

type ProductStatusBadgeProps = {
  status: ProductStatus;
};

const statusConfig = {
  DRAFT: {
    label: 'Bản nháp',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },

  PUBLISHED: {
    label: 'Đã xuất bản',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },

  ARCHIVED: {
    label: 'Đã lưu trữ',
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
} satisfies Record<
  ProductStatus,
  {
    label: string;
    className: string;
  }
>;

export function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}
