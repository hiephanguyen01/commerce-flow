import type { ProductVariantStatus } from '../types/admin-product';

type VariantStatusBadgeProps = {
  status: ProductVariantStatus;
};

export function VariantStatusBadge({ status }: VariantStatusBadgeProps) {
  const active = status === 'ACTIVE';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20',
      ].join(' ')}
    >
      {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </span>
  );
}
