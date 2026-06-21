import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/same-origin';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categoryId: z.string().uuid().nullable().optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
});
function createAuthenticatedApi(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return null;
  }
  return createServerApi({
    accessToken,
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
export async function GET(request: NextRequest) {
  const serverApi = createAuthenticatedApi(request);
  if (!serverApi) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      { status: 401 },
    );
  }
  try {
    const { data } = await serverApi.get('/api/v1/admin/products', {
      params: request.nextUrl.searchParams,
    });
    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ORIGIN', message: 'Invalid request origin' } },
      { status: 403 },
    );
  }
  const serverApi = createAuthenticatedApi(request);
  if (!serverApi) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      { status: 401 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product data is invalid',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  try {
    const { data } = await serverApi.post('/api/v1/admin/products', parsed.data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
