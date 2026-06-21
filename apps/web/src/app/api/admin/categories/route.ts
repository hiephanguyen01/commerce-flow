import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      { status: 401 },
    );
  }
  const serverApi = createServerApi({ accessToken });
  try {
    const { data } = await serverApi.get('/api/v1/admin/categories', {
      params: { page: 1, limit: 100, isActive: true },
    });
    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
