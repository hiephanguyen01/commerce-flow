// placeholder
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const t = await getTranslations('Admin.dashboard');

  return (
    <div>
      <p className="text-sm font-medium text-indigo-600">{t('eyebrow')}</p>

      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{t('title')}</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          title={t('productsTitle')}
          description={t('productsDescription')}
          href={`/${locale}/admin/products`}
        />

        <DashboardCard
          title={t('categoriesTitle')}
          description={t('categoriesDescription')}
          href={`/${locale}/admin/categories`}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h2 className="font-semibold text-slate-950">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}
