'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth-api';
import { authQueryKeys } from './auth-query-keys';

export function useCurrentUser() {
  return useQuery({
    queryKey: authQueryKeys.currentUser(),

    queryFn: ({ signal }) => getCurrentUser(signal),

    staleTime: 60_000,
  });
}
