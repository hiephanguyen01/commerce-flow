import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  const user = await requireAdmin(locale);

  return (
    <AdminShell locale={locale} user={user}>
      {children}
    </AdminShell>
  );
}
