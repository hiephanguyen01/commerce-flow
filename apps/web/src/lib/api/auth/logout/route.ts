import { clearAuthCookies, REFRESH_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/same-origin';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Đăng xuất session hiện tại.
 *
 * Browser không gửi refresh token trong body.
 * Route Handler đọc refresh token từ HttpOnly cookie,
 * gọi NestJS để revoke session, sau đó xóa cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_ORIGIN',
          message: 'Invalid request origin',
        },
      },
      {
        status: 403,
      },
    );
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  /*
   * Không có refresh token vẫn được xem là logout thành công.
   * Logout cần có tính idempotent.
   */
  if (!refreshToken) {
    const response = NextResponse.json({
      success: true,
    });

    clearAuthCookies(response);

    return response;
  }

  const requestId = request.headers.get('x-request-id') ?? undefined;

  const serverApi = createServerApi({
    requestId,
  });

  try {
    await serverApi.post('/api/v1/auth/logout', {
      refreshToken,
    });
  } catch {
    /*
     * Vẫn xóa cookie phía browser ngay cả khi:
     * - session đã bị revoke;
     * - refresh token đã hết hạn;
     * - backend tạm thời không phản hồi.
     *
     * Người dùng vẫn được đăng xuất khỏi thiết bị hiện tại.
     */
  }

  const response = NextResponse.json({
    success: true,
  });

  clearAuthCookies(response);

  return response;
}
