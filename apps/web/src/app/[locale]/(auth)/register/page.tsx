import { RegisterForm } from '@/features/authentication/components/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | CommerceFlow',
};

type RegisterPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;

  return <RegisterForm locale={locale} />;
}
