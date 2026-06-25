// placeholder
'use client';

import { parseApiError } from '@/lib/http/api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAdminCategories } from '../hooks/use-admin-product';
import { useCreateProduct } from '../hooks/use-create-product';
import { useUpdateProduct } from '../hooks/use-update-product';
import {
  createSlug,
  createProductFormSchema,
  toProductPayload,
  type ProductFormValues,
} from '../schemas/product-form.schema';
import type { AdminProductDetail } from '../types/admin-product';

type ProductFormProps = {
  locale: string;
  product?: AdminProductDetail;
};

export function ProductForm({ locale, product }: ProductFormProps) {
  const t = useTranslations('Admin.products');
  const validationT = useTranslations('Admin.productValidation');
  const editing = Boolean(product);

  const [slugEdited, setSlugEdited] = useState(editing);

  const categoriesQuery = useAdminCategories();

  const createMutation = useCreateProduct(locale);

  const updateMutation = useUpdateProduct();

  const schema = useMemo(() => createProductFormSchema(validationT), [validationT]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema),

    mode: 'onTouched',

    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      categoryId: product?.categoryId ?? '',
      shortDescription: product?.shortDescription ?? '',
      description: product?.description ?? '',
    },
  });

  const name = form.watch('name');

  useEffect(() => {
    if (!slugEdited) {
      form.setValue('slug', createSlug(name), {
        shouldValidate: false,
      });
    }
  }, [form, name, slugEdited]);

  const mutation = editing ? updateMutation : createMutation;

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  async function onSubmit(values: ProductFormValues): Promise<void> {
    const payload = toProductPayload(values);

    try {
      if (product) {
        await updateMutation.mutateAsync({
          productId: product.id,

          input: {
            ...payload,

            expectedVersion: product.version,
          },
        });

        return;
      }

      await createMutation.mutateAsync(payload);
    } catch {
      // Error được hiển thị từ mutation state.
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {apiError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            {apiError.code === 'PRODUCT_VERSION_CONFLICT'
              ? t('versionConflict')
              : apiError.message}
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{t('basicInfo')}</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label={t('nameLabel')} error={form.formState.errors.name?.message}>
            <input {...form.register('name')} className={inputClass} placeholder="iPhone 16 Pro" />
          </Field>

          <Field label="Slug" error={form.formState.errors.slug?.message}>
            <input
              {...form.register('slug', {
                onChange: () => {
                  setSlugEdited(true);
                },
              })}
              className={inputClass}
              placeholder="iphone-16-pro"
            />
          </Field>

          <Field label={t('categoryLabel')}>
            <select
              {...form.register('categoryId')}
              className={inputClass}
              disabled={categoriesQuery.isPending}
            >
              <option value="">{t('noCategory')}</option>

              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <div />

          <div className="sm:col-span-2">
            <Field
              label={t('shortDescriptionLabel')}
              error={form.formState.errors.shortDescription?.message}
            >
              <textarea
                {...form.register('shortDescription')}
                rows={3}
                className={inputClass}
                placeholder={t('shortDescriptionPlaceholder')}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label={t('descriptionLabel')} error={form.formState.errors.description?.message}>
              <textarea
                {...form.register('description')}
                rows={10}
                className={inputClass}
                placeholder={t('descriptionPlaceholder')}
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-11 min-w-36 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? t('saving') : editing ? t('saveChanges') : t('create')}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>

      {children}

      {error ? (
        <span role="alert" className="mt-1.5 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const inputClass = [
  'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5',
  'text-sm text-slate-950 outline-none transition',
  'placeholder:text-slate-400',
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
  'disabled:bg-slate-100 disabled:text-slate-500',
].join(' ');
