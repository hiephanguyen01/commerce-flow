import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type ForbiddenPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ForbiddenPage({ params }: ForbiddenPageProps) {
  const { locale } = await params;
  const t = await getTranslations('Admin.forbidden');

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-red-600">{t('eyebrow')}</p>

      <h1 className="mt-3 text-2xl font-semibold text-slate-950">{t('title')}</h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">{t('description')}</p>

      <Link
        href={`/${locale}/account`}
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
      >
        {t('backToAccount')}
      </Link>
    </div>
  );
}
