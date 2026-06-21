import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';

type CurrentUserResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: 'CUSTOMER' | 'ADMIN';
  };
};

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required',
        },
      },
      {
        status: 401,
      },
    );
  }

  const serverApi = createServerApi({
    accessToken,

    requestId: request.headers.get('x-request-id') ?? undefined,
  });

  try {
    const { data } = await serverApi.get<CurrentUserResponse>('/api/v1/auth/me');

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
