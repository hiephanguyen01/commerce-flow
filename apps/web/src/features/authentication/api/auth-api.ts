import { browserApi } from '@/lib/http/browser-api';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
};

export type LoginApiInput = {
  email: string;
  password: string;
};

export type RegisterApiInput = {
  displayName: string;
  email: string;
  password: string;
};

export async function login(input: LoginApiInput): Promise<AuthUser> {
  const response = await browserApi.post<{
    user: AuthUser;
  }>('/auth/login', input);

  return response.data.user;
}

export async function registerAccount(input: RegisterApiInput): Promise<AuthUser> {
  const response = await browserApi.post<{
    user: AuthUser;
  }>('/auth/register', input);

  return response.data.user;
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const response = await browserApi.get<{
    user: AuthUser;
  }>('/auth/me', {
    signal,
  });

  return response.data.user;
}

export async function logout(): Promise<void> {
  await browserApi.post('/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await browserApi.post('/auth/logout-all');
}
