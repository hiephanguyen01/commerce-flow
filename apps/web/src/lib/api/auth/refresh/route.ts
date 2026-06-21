import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '@/lib/auth/cookies';
import { createServerApi } from '@/lib/http/server-api';
import { createRouteErrorResponse } from '@/lib/http/route-error';

type RefreshResponse = {
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

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json(
      {
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired',
        },
      },
      {
        status: 401,
      },
    );

    clearAuthCookies(response);

    return response;
  }

  const serverApi = createServerApi({
    requestId: request.headers.get('x-request-id') ?? undefined,
  });

  try {
    const { data } = await serverApi.post<RefreshResponse>('/api/v1/auth/refresh', {
      refreshToken,
    });

    const response = NextResponse.json({
      user: data.user,
    });

    setAuthCookies(response, data.tokens);

    return response;
  } catch (error) {
    const response = createRouteErrorResponse(error);

    /*
     * Có thể giữ cookie khi lỗi 503/504 vì backend chỉ tạm unavailable.
     * Xóa cookie khi refresh token thực sự không còn hợp lệ.
     */
    if (response.status === 401 || response.status === 409) {
      clearAuthCookies(response);
    }

    return response;
  }
}
