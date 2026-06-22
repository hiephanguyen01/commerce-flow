import { isSameOrigin } from '@/lib/auth/same-origin';
import {
  createAdminRouteApi,
  createInvalidOriginResponse,
  createUnauthenticatedResponse,
  createValidationResponse,
} from '@/lib/http/admin-route-api';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createVariantSchema = z.object({
  name: z.string().trim().min(1).max(160),

  sku: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),

  priceAmount: z.number().int().min(0),

  compareAtPrice: z.number().int().min(0).nullable().optional(),

  currency: z.literal('VND').optional(),

  attributes: z.record(z.string(), z.string()).optional(),

  sortOrder: z.number().int().min(0).optional(),
});

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { productId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  try {
    const { data } = await serverApi.get(`/api/v1/admin/products/${productId}/variants`);

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = createVariantSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.post(
      `/api/v1/admin/products/${productId}/variants`,
      parsed.data,
    );

    return NextResponse.json(data, {
      status: 201,
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
