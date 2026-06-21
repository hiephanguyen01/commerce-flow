import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { createServerApi } from '@/lib/http/server-api';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import 'server-only';
export type RequiredAdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'ADMIN';
};
type CurrentUserResponse = {
  user: { id: string; email: string; displayName: string | null; role: 'CUSTOMER' | 'ADMIN' };
};
export async function requireAdmin(locale: string): Promise<RequiredAdminUser> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/admin`)}`);
  }
  const serverApi = createServerApi({ accessToken });
  try {
    const { data } = await serverApi.get<CurrentUserResponse>('/api/v1/auth/me');
    console.log("🚀 ~ requireAdmin ~ data:", data)
    if (data.user.role !== 'ADMIN') {
      redirect(`/${locale}/admin/forbidden`);
    }
    return { ...data.user, role: 'ADMIN' };
  } catch (error) {
    console.error('requireAdmin error:', error);
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/admin`)}`);
  }
}
