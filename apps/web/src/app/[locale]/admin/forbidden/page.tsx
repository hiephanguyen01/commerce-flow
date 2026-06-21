import Link from 'next/link';

type ForbiddenPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ForbiddenPage({ params }: ForbiddenPageProps) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-red-600">403 — Forbidden</p>

      <h1 className="mt-3 text-2xl font-semibold text-slate-950">Bạn không có quyền truy cập</h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Tài khoản hiện tại không có quyền quản trị CommerceFlow.
      </p>

      <Link
        href={`/${locale}/account`}
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
      >
        Quay về tài khoản
      </Link>
    </div>
  );
}
