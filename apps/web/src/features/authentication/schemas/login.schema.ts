import { z } from 'zod';

export type LoginInput = {
  email: string;
  password: string;
};

type TranslationFunction = (key: string) => string;

export function createLoginSchema(t: TranslationFunction) {
  return z.object({
    email: z.string().trim().min(1, t('emailRequired')).email(t('emailInvalid')),

    password: z.string().min(1, t('passwordRequired')).max(128, t('passwordTooLong')),
  });
}
