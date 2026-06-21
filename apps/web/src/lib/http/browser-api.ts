'use client';

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export const browserApi = axios.create({
  // Browser chỉ gọi Next.js BFF.
  baseURL: '/api',

  timeout: 15_000,

  // Cần thiết nếu sau này FE và BFF khác origin.
  // Với cùng origin, browser vốn đã tự gửi cookie.
  withCredentials: true,

  headers: {
    Accept: 'application/json',
  },
});

/**
 * Client riêng cho refresh.
 *
 * Không dùng browserApi để tránh interceptor của refresh
 * tự gọi lại refresh và tạo vòng lặp vô hạn.
 */
const refreshApi = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

let refreshPromise: Promise<void> | null = null;

function isAuthenticationEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

async function refreshSession(): Promise<void> {
  await refreshApi.post('/auth/refresh');
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const segments = window.location.pathname.split('/').filter(Boolean);

  const locale = segments[0] === 'en' || segments[0] === 'vi' ? segments[0] : 'vi';

  const loginPath = `/${locale}/login`;

  if (window.location.pathname === loginPath) {
    return;
  }

  const returnTo = window.location.pathname + window.location.search;

  window.location.replace(`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
}

browserApi.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthenticationEndpoint(originalRequest.url);

    if (!shouldRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Single-flight:
       * N request cùng nhận 401 chỉ tạo một request refresh.
       */
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });

      await refreshPromise;

      // Cookie đã được Route Handler cập nhật.
      // Gửi lại request ban đầu.
      return browserApi.request(originalRequest);
    } catch (refreshError) {
      redirectToLogin();

      return Promise.reject(refreshError);
    }
  },
);
