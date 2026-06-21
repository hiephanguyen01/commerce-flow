'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { registerAccount, type RegisterApiInput } from '../api/auth-api';
import { authQueryKeys } from './auth-query-keys';

type UseRegisterOptions = {
  successPath: string;
};

export function useRegister({ successPath }: UseRegisterOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['authentication', 'register'],

    mutationFn: (input: RegisterApiInput) => registerAccount(input),

    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKeys.currentUser(), user);

      router.replace(successPath);
      router.refresh();
    },
  });
}
