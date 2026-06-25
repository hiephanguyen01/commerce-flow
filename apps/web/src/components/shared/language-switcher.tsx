'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useTransition } from 'react';

type AppLocale = (typeof routing.locales)[number];

const LANGUAGE_LABELS: Record<AppLocale, string> = {
  vi: 'VI',
  en: 'EN',
};

function getNextLocale(locale: AppLocale): AppLocale {
  return locale === 'vi' ? 'en' : 'vi';
}

export function LanguageSwitcher() {
  return (
    <Suspense fallback={<LanguageSwitcherFallback />}>
      <LanguageSwitcherContent />
    </Suspense>
  );
}

function LanguageSwitcherContent() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const nextLocale = getNextLocale(locale);
  const search = searchParams.toString();
  const href = search ? `${pathname}?${search}` : pathname;

  function handleSwitchLanguage() {
    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
  }

  return (
    <button
      type="button"
      aria-label={`Switch language to ${nextLocale === 'vi' ? 'Vietnamese' : 'English'}`}
      disabled={isPending}
      onClick={handleSwitchLanguage}
      className="inline-flex h-10 min-w-20 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {LANGUAGE_LABELS[locale]}
    </button>
  );
}

function LanguageSwitcherFallback() {
  return (
    <span className="inline-flex h-10 min-w-20 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-400">
      VI / EN
    </span>
  );
}
