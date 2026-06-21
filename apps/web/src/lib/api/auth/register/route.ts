import { setAuthCookies } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/same-origin';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(10).max(128),
});

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: 'CUSTOMER' | 'ADMIN';
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  };
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_ORIGIN',
          message: 'Invalid origin',
        },
      },
      {
        status: 403,
      },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
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
    const { data, status } = await serverApi.post<RegisterResponse>(
      '/api/v1/auth/register',
      parsed.data,
    );

    const response = NextResponse.json(
      {
        user: data.user,
      },
      {
        status,
      },
    );

    setAuthCookies(response, data.tokens);

    return response;
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
