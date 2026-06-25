'use client';

import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { LogoutButton } from '@/features/authentication/components/logout-button';
import { useCurrentUser } from '@/features/authentication/hooks/use-current-user';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function AccountPage() {
  const t = useTranslations('Account');

  const params = useParams<{
    locale: string;
  }>();

  const currentUser = useCurrentUser();

  if (currentUser.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          {t('loading')}
        </div>
      </main>
    );
  }

  if (currentUser.isError || !currentUser.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {t('loadError')}
        </div>
      </main>
    );
  }

  const user = currentUser.data;

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
              {getInitials(user.displayName ?? user.email)}
            </div>

            <div>
              <p className="text-sm text-slate-500">{t('signedInWith')}</p>

              <h1 className="text-xl font-semibold text-slate-950">
                {user.displayName ?? user.email}
              </h1>

              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <LogoutButton locale={params.locale} />
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <AccountItem label={t('userId')} value={user.id} />

          <AccountItem label={t('role')} value={user.role} />
        </section>
      </div>
    </main>
  );
}

type AccountItemProps = {
  label: string;
  value: string;
};

function AccountItem({ label, value }: AccountItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 break-all font-medium text-slate-950">{value}</p>
    </div>
  );
}

function getInitials(value: string): string {
  return value
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
