'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

type AppProviderProps = {
  children: React.ReactNode;
};

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false;
  }

  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  // Network failure.
  if (!status) {
    return true;
  }

  // Không retry lỗi client/business.
  if (status >= 400 && status < 500) {
    return false;
  }

  return status >= 500;
}

export function AppProvider({ children }: AppProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,

            retry: shouldRetryQuery,

            refetchOnWindowFocus: false,
          },

          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
