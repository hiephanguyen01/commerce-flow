import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('HomePage');

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <h1 className="text-4xl font-bold">
        {t('title')}
      </h1>

      <p className="mt-4 text-lg text-neutral-600">
        {t('description')}
      </p>
    </main>
  );
}