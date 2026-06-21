import { z } from 'zod';

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự')
    .max(200, 'Tên sản phẩm không được vượt quá 200 ký tự'),

  slug: z
    .string()
    .trim()
    .min(2, 'Slug là bắt buộc')
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),

  categoryId: z.string().optional(),

  shortDescription: z
    .string()
    .trim()
    .max(500, 'Mô tả ngắn không được vượt quá 500 ký tự')
    .optional(),

  description: z.string().trim().max(20_000, 'Mô tả không được vượt quá 20.000 ký tự').optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function toProductPayload(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),

    categoryId: values.categoryId || null,

    shortDescription: values.shortDescription?.trim() || null,

    description: values.description?.trim() || null,
  };
}

export function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
