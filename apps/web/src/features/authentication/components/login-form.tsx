'use client';

import { Link } from '@/i18n/navigation';
import { parseApiError } from '@/lib/http/api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useLogin } from '../hooks/use-login';
import { createLoginSchema, type LoginInput } from '../schemas/login.schema';
import { PasswordField } from './password-field';
import { TextField } from './text-field';

type LoginFormProps = {
  locale: string;
};

export function LoginForm({ locale }: LoginFormProps) {
  const t = useTranslations('Auth.login');
  
  const validationT = useTranslations('Auth.validation');

  const schema = useMemo(() => createLoginSchema(validationT), [validationT]);

  const loginMutation = useLogin({
    successPath: `/${locale}/account`,
  });

  const form = useForm<LoginInput>({
    resolver: zodResolver(schema),

    mode: 'onTouched',

    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginInput): Promise<void> {
    try {
      await loginMutation.mutateAsync({
        email: values.email.trim(),
        password: values.password,
      });
    } catch {
      // Error được đọc từ loginMutation.error.
    }
  }

  const apiError = loginMutation.error ? parseApiError(loginMutation.error) : null;

  const submitting = loginMutation.isPending;

  return (
    <div>
      <header>
        <p className="text-sm font-medium text-indigo-600">{t('eyebrow')}</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t('title')}</h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">{t('description')}</p>
      </header>

      {apiError ? (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{apiError.message}</p>

          {apiError.requestId ? (
            <p className="mt-1 text-xs text-red-600">Request ID: {apiError.requestId}</p>
          ) : null}
        </div>
      ) : null}

      <form className="mt-7 space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <TextField
          id="email"
          type="email"
          label={t('emailLabel')}
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          disabled={submitting}
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <PasswordField
          id="password"
          label={t('passwordLabel')}
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          disabled={submitting}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoadingSpinner />

              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs uppercase tracking-wide text-slate-400">{t('newUser')}</span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <Link
        href={`/register`}
        className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
      >
        {t('createAccount')}
      </Link>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}
