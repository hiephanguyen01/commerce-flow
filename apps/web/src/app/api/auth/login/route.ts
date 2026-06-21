import { setAuthCookies } from '@/lib/auth/cookies';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: 'CUSTOMER' | 'ADMIN';
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};

type LoginResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Login data is invalid',
          details: parsed.error.flatten(),
        },
      },
      {
        status: 400,
      },
    );
  }

  const serverApi = createServerApi({
    requestId: request.headers.get('x-request-id') ?? undefined,
  });

  try {
    const response = await serverApi.post<LoginResponse>('/api/v1/auth/login', parsed.data);

    const authResult = response.data;

    const nextResponse = NextResponse.json({
      user: authResult.user,
    });

    setAuthCookies(nextResponse, authResult.tokens);

    return nextResponse;
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
