import { z } from 'zod';

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type TranslationFunction = (key: string) => string;

export function createRegisterSchema(t: TranslationFunction) {
  return z
    .object({
      displayName: z
        .string()
        .trim()
        .min(2, t('displayNameTooShort'))
        .max(120, t('displayNameTooLong')),

      email: z.string().trim().min(1, t('emailRequired')).email(t('emailInvalid')),

      password: z.string().min(10, t('passwordTooShort')).max(128, t('passwordTooLong')),

      confirmPassword: z.string().min(1, t('confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('passwordsDoNotMatch'),
    });
}
