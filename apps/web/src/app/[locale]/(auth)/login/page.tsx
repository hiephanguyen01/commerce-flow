import { LoginForm } from '@/features/authentication/components/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | CommerceFlow',
};

type LoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  return <LoginForm locale={locale} />;
}
