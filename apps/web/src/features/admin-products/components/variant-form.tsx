'use client';

import { parseApiError } from '@/lib/http/api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
  useCreateProductVariant,
  useUpdateProductVariant,
} from '../hooks/use-product-variant-mutations';
import {
  formatMoneyInput,
  createVariantFormSchema,
  normalizeMoneyDigits,
  toVariantPayload,
  variantAttributesToForm,
  type VariantFormValues,
} from '../schemas/variant-form.schema';
import type { AdminProductVariant } from '../types/admin-product';

type VariantFormProps = {
  productId: string;
  variant?: AdminProductVariant;
  disabled?: boolean;
  onCancel: () => void;
  onSaved: () => void;
};

export function VariantForm({
  productId,
  variant,
  disabled = false,
  onCancel,
  onSaved,
}: VariantFormProps) {
  const t = useTranslations('Admin.products');
  const validationT = useTranslations('Admin.variantValidation');
  const editing = Boolean(variant);

  const createMutation = useCreateProductVariant(productId);

  const updateMutation = useUpdateProductVariant(productId);

  const schema = useMemo(() => createVariantFormSchema(validationT), [validationT]);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(schema),

    mode: 'onTouched',

    defaultValues: {
      name: variant?.name ?? '',
      sku: variant?.sku ?? '',

      priceAmount: variant ? String(variant.priceAmount) : '',

      compareAtPrice:
        variant?.compareAtPrice !== null && variant?.compareAtPrice !== undefined
          ? String(variant.compareAtPrice)
          : '',

      sortOrder: variant?.sortOrder ?? 0,

      attributes: variantAttributesToForm(variant?.attributes ?? null),
    },
  });

  const attributes = useFieldArray({
    control: form.control,
    name: 'attributes',
  });

  const mutation = editing ? updateMutation : createMutation;

  const parsedError = mutation.error ? parseApiError(mutation.error) : null;

  async function onSubmit(values: VariantFormValues): Promise<void> {
    const payload = toVariantPayload(values);

    try {
      if (variant) {
        await updateMutation.mutateAsync({
          variantId: variant.id,

          input: {
            ...payload,

            expectedVersion: variant.version,
          },
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSaved();
    } catch {
      // Mutation state hiển thị lỗi.
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5"
      noValidate
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">
            {editing ? t('editVariant') : t('createVariant')}
          </h3>

          <p className="mt-1 text-sm text-slate-500">{t('variantPriceHint')}</p>
        </div>

        {variant ? (
          <span className="text-xs text-slate-500">
            {t('variantVersion', {
              version: variant.version,
            })}
          </span>
        ) : null}
      </div>

      {parsedError ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getVariantErrorMessage(parsedError.code, parsedError.message, t)}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label={t('variantNameLabel')} error={form.formState.errors.name?.message}>
          <input
            {...form.register('name')}
            className={inputClass}
            placeholder="Natural Titanium / 256GB"
            disabled={disabled}
          />
        </Field>

        <Field label="SKU" error={form.formState.errors.sku?.message}>
          <input
            {...form.register('sku', {
              onChange: (event) => {
                event.target.value = event.target.value.toUpperCase().replace(/\s+/g, '-');
              },
            })}
            className={inputClass}
            placeholder="IP16P-NT-256"
            disabled={disabled}
          />
        </Field>

        <Field label={t('priceLabel')} error={form.formState.errors.priceAmount?.message}>
          <Controller
            control={form.control}
            name="priceAmount"
            render={({ field }) => (
              <div className="relative">
                <input
                  value={formatMoneyInput(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(normalizeMoneyDigits(event.target.value));
                  }}
                  inputMode="numeric"
                  className={`${inputClass} pr-14`}
                  placeholder="28.990.000"
                  disabled={disabled}
                />

                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-500">
                  ₫
                </span>
              </div>
            )}
          />
        </Field>

        <Field
          label={t('compareAtPriceLabel')}
          error={form.formState.errors.compareAtPrice?.message}
        >
          <Controller
            control={form.control}
            name="compareAtPrice"
            render={({ field }) => (
              <div className="relative">
                <input
                  value={formatMoneyInput(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(normalizeMoneyDigits(event.target.value));
                  }}
                  inputMode="numeric"
                  className={`${inputClass} pr-14`}
                  placeholder="30.990.000"
                  disabled={disabled}
                />

                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-500">
                  ₫
                </span>
              </div>
            )}
          />
        </Field>

        <Field label={t('sortOrderLabel')} error={form.formState.errors.sortOrder?.message}>
          <input
            {...form.register('sortOrder', {
              valueAsNumber: true,
            })}
            type="number"
            min={0}
            className={inputClass}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="mt-7 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-950">{t('attributesTitle')}</h4>

            <p className="mt-1 text-xs text-slate-500">{t('attributesHint')}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              attributes.append({
                key: '',
                value: '',
              });
            }}
            disabled={disabled}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            {t('addAttribute')}
          </button>
        </div>

        {form.formState.errors.attributes?.message ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {form.formState.errors.attributes.message}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {attributes.fields.map((attribute, index) => (
            <div key={attribute.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                {...form.register(`attributes.${index}.key`)}
                className={inputClass}
                placeholder="color"
                disabled={disabled}
              />

              <input
                {...form.register(`attributes.${index}.value`)}
                className={inputClass}
                placeholder="Natural Titanium"
                disabled={disabled}
              />

              <button
                type="button"
                onClick={() => {
                  attributes.remove(index);
                }}
                disabled={disabled}
                className="h-11 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                {t('delete')}
              </button>

              {form.formState.errors.attributes?.[index]?.key?.message ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.attributes[index]?.key?.message}
                </p>
              ) : null}

              {form.formState.errors.attributes?.[index]?.value?.message ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.attributes[index]?.value?.message}
                </p>
              ) : null}
            </div>
          ))}

          {attributes.fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {t('noAttributes')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {t('cancel')}
        </button>

        <button
          type="submit"
          disabled={disabled || mutation.isPending}
          className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? t('saving') : editing ? t('saveVariant') : t('createVariant')}
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

type ProductsTranslator = ReturnType<typeof useTranslations>;

function getVariantErrorMessage(code: string, fallback: string, t: ProductsTranslator): string {
  switch (code) {
    case 'VARIANT_SKU_ALREADY_EXISTS':
      return t('skuAlreadyExists');

    case 'VARIANT_VERSION_CONFLICT':
      return t('variantConflict');

    case 'ARCHIVED_PRODUCT_CANNOT_BE_MODIFIED':
      return t('archivedVariantError');

    case 'INVALID_COMPARE_AT_PRICE':
      return t('invalidCompareAtPrice');

    default:
      return fallback;
  }
}

const inputClass = [
  'block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5',
  'text-sm text-slate-950 outline-none transition',
  'placeholder:text-slate-400',
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
].join(' ');
