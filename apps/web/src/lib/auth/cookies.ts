import { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'commerce_access';

export const REFRESH_COOKIE = 'commerce_refresh';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};

export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.accessTokenExpiresIn,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: tokens.refreshTokenExpiresIn,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/api/auth',
  });
}
