'use client';

import { useLogout } from '../hooks/use-logout';

type LogoutButtonProps = {
  locale: string;
};

export function LogoutButton({ locale }: LogoutButtonProps) {
  const logoutMutation = useLogout({
    redirectPath: `/${locale}/login`,
  });

  return (
    <button
      type="button"
      disabled={logoutMutation.isPending}
      onClick={() => {
        logoutMutation.mutate();
      }}
      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
    </button>
  );
}
