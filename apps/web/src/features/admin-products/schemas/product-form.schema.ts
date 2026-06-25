import { z } from 'zod';

type TranslationFunction = (key: string) => string;

export function createProductFormSchema(t: TranslationFunction) {
  return z.object({
    name: z.string().trim().min(2, t('nameTooShort')).max(200, t('nameTooLong')),

    slug: z
      .string()
      .trim()
      .min(2, t('slugRequired'))
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t('slugInvalid')),

    categoryId: z.string().optional(),

    shortDescription: z.string().trim().max(500, t('shortDescriptionTooLong')).optional(),

    description: z.string().trim().max(20_000, t('descriptionTooLong')).optional(),
  });
}

export type ProductFormValues = z.infer<ReturnType<typeof createProductFormSchema>>;

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
