'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../api/auth-api';
import { authQueryKeys } from './auth-query-keys';

type UseLogoutOptions = {
  redirectPath: string;
};

export function useLogout({ redirectPath }: UseLogoutOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['authentication', 'logout'],

    mutationFn: logout,

    onSettled: async () => {
      queryClient.removeQueries({
        queryKey: authQueryKeys.all,
      });

      router.replace(redirectPath);
      router.refresh();
    },
  });
}
