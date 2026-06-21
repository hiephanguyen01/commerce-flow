'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { login, type LoginApiInput } from '../api/auth-api';
import { authQueryKeys } from './auth-query-keys';

type UseLoginOptions = {
  successPath: string;
};

export function useLogin({ successPath }: UseLoginOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['authentication', 'login'],

    mutationFn: (input: LoginApiInput) => login(input),

    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKeys.currentUser(), user);

      router.replace(successPath);
      router.refresh();
    },
  });
}
