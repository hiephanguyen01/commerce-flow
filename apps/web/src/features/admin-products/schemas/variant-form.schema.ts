import { z } from 'zod';

const moneySchema = z
  .string()
  .trim()
  .min(1, 'Giá bán là bắt buộc')
  .regex(/^\d+$/, 'Giá bán phải là số nguyên');

const optionalMoneySchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), {
    message: 'Giá so sánh phải là số nguyên',
  });

const attributeSchema = z.object({
  key: z.string().trim().min(1, 'Tên thuộc tính là bắt buộc').max(80),

  value: z.string().trim().min(1, 'Giá trị thuộc tính là bắt buộc').max(160),
});

export const variantFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên biến thể là bắt buộc').max(160),

    sku: z
      .string()
      .trim()
      .min(2, 'SKU phải có ít nhất 2 ký tự')
      .max(80)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
        'SKU chỉ gồm chữ, số, dấu chấm, gạch dưới và gạch ngang',
      ),

    priceAmount: moneySchema,

    compareAtPrice: optionalMoneySchema,

    attributes: z.array(attributeSchema).max(20, 'Tối đa 20 thuộc tính'),

    sortOrder: z.number().int().min(0),
  })
  .superRefine((value, context) => {
    const priceAmount = Number(value.priceAmount);

    const compareAtPrice = value.compareAtPrice === '' ? null : Number(value.compareAtPrice);

    if (compareAtPrice !== null && compareAtPrice < priceAmount) {
      context.addIssue({
        code: 'custom',
        path: ['compareAtPrice'],
        message: 'Giá so sánh không được thấp hơn giá bán',
      });
    }

    const normalizedKeys = value.attributes.map((attribute) => attribute.key.trim().toLowerCase());

    if (new Set(normalizedKeys).size !== normalizedKeys.length) {
      context.addIssue({
        code: 'custom',
        path: ['attributes'],
        message: 'Tên thuộc tính không được trùng nhau',
      });
    }
  });

export type VariantFormValues = z.infer<typeof variantFormSchema>;

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
