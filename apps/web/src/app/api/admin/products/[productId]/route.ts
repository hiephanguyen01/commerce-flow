import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { isSameOrigin } from '@/lib/auth/same-origin';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    categoryId: z.string().uuid().nullable().optional(),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    description: z.string().trim().max(20_000).nullable().optional(),
    expectedVersion: z.number().int().min(1),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), {
    message: 'At least one product field must be updated',
  });
type RouteContext = { params: Promise<{ productId: string }> };
function getServerApi(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return null;
  }
  return createServerApi({
    accessToken,
    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}
export async function GET(request: NextRequest, context: RouteContext) {
  const { productId } = await context.params;
  const serverApi = getServerApi(request);
  if (!serverApi) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      { status: 401 },
    );
  }
  try {
    const { data } = await serverApi.get(`/api/v1/admin/products/${productId}`);
    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ORIGIN', message: 'Invalid request origin' } },
      { status: 403 },
    );
  }
  const { productId } = await context.params;
  const serverApi = getServerApi(request);
  if (!serverApi) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      { status: 401 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
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
    const { data } = await serverApi.patch(`/api/v1/admin/products/${productId}`, parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
} // placeholder
