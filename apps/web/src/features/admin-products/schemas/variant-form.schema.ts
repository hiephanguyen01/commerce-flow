import { z } from 'zod';

type TranslationFunction = (key: string) => string;

function createMoneySchema(t: TranslationFunction) {
  return z.string().trim().min(1, t('priceRequired')).regex(/^\d+$/, t('priceInteger'));
}

function createOptionalMoneySchema(t: TranslationFunction) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), {
      message: t('compareAtPriceInteger'),
    });
}

function createAttributeSchema(t: TranslationFunction) {
  return z.object({
    key: z.string().trim().min(1, t('attributeKeyRequired')).max(80),

    value: z.string().trim().min(1, t('attributeValueRequired')).max(160),
  });
}

export function createVariantFormSchema(t: TranslationFunction) {
  return z
    .object({
      name: z.string().trim().min(1, t('variantNameRequired')).max(160),

      sku: z
        .string()
        .trim()
        .min(2, t('skuTooShort'))
        .max(80)
        .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, t('skuInvalid')),

      priceAmount: createMoneySchema(t),

      compareAtPrice: createOptionalMoneySchema(t),

      attributes: z.array(createAttributeSchema(t)).max(20, t('attributesTooMany')),

      sortOrder: z.number().int().min(0),
    })
    .superRefine((value, context) => {
      const priceAmount = Number(value.priceAmount);

      const compareAtPrice = value.compareAtPrice === '' ? null : Number(value.compareAtPrice);

      if (compareAtPrice !== null && compareAtPrice < priceAmount) {
        context.addIssue({
          code: 'custom',
          path: ['compareAtPrice'],
          message: t('compareAtPriceTooLow'),
        });
      }

      const normalizedKeys = value.attributes.map((attribute) =>
        attribute.key.trim().toLowerCase(),
      );

      if (new Set(normalizedKeys).size !== normalizedKeys.length) {
        context.addIssue({
          code: 'custom',
          path: ['attributes'],
          message: t('duplicateAttributeKeys'),
        });
      }
    });
}

export type VariantFormValues = z.infer<ReturnType<typeof createVariantFormSchema>>;

export type VariantPayload = {
  name: string;
  sku: string;
  priceAmount: number;
  compareAtPrice: number | null;
  currency: 'VND';
  attributes: Record<string, string>;
  sortOrder: number;
};

export function toVariantPayload(values: VariantFormValues): VariantPayload {
  const attributes = Object.fromEntries(
    values.attributes.map((attribute) => [attribute.key.trim(), attribute.value.trim()]),
  );

  return {
    name: values.name.trim(),

    sku: values.sku.trim().toUpperCase(),

    priceAmount: Number(values.priceAmount),

    compareAtPrice: values.compareAtPrice === '' ? null : Number(values.compareAtPrice),

    currency: 'VND',
    attributes,
    sortOrder: values.sortOrder,
  };
}

export function variantAttributesToForm(attributes: Record<string, string> | null): Array<{
  key: string;
  value: string;
}> {
  if (!attributes) {
    return [];
  }

  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value,
  }));
}

export function normalizeMoneyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatMoneyInput(value: string): string {
  if (!value) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value));
}
