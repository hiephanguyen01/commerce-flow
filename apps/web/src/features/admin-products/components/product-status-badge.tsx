// placeholder
import { useTranslations } from 'next-intl';
import type { ProductStatus } from '../types/admin-product';

type ProductStatusBadgeProps = {
  status: ProductStatus;
};

const statusConfig = {
  DRAFT: {
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },

  PUBLISHED: {
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },

  ARCHIVED: {
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
} satisfies Record<
  ProductStatus,
  {
    className: string;
  }
>;

export function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
  const t = useTranslations('Admin.productStatus');
  const config = statusConfig[status];

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        config.className,
      ].join(' ')}
    >
      {t(status)}
    </span>
  );
}
