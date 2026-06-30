import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { LogoutButton } from '@/features/authentication/components/logout-button';
import type { RequiredAdminUser } from '@/lib/auth/require-admin';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';

type AdminShellProps = {
  locale: string;
  user: RequiredAdminUser;
  children: ReactNode;
};

export function AdminShell({ locale, user, children }: AdminShellProps) {
  const t = useTranslations('Admin.shell');

  const navigation = [
    {
      label: t('overview'),
      href: `/${locale}/admin`,
    },
    {
      label: t('products'),
      href: `/${locale}/admin/products`,
    },
    {
      label: t('categories'),
      href: `/${locale}/admin/categories`,
    },
    {
      label: 'Tồn kho',
      href: `/${locale}/admin/inventory`,
    },
  ];

  return (
    <div className="min-h-dvh bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link href={`/${locale}/admin`} className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              CF
            </span>

            <span className="font-semibold text-slate-950">CommerceFlow</span>
          </Link>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-sm font-medium text-slate-950">{user.displayName ?? user.email}</p>

            <p className="text-xs text-slate-500">{t('role')}</p>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <LogoutButton locale={locale} />
          </div>
        </header>

        <div className="px-5 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
