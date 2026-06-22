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

const updateVariantSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),

    sku: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
      .optional(),

    priceAmount: z.number().int().min(0).optional(),

    compareAtPrice: z.number().int().min(0).nullable().optional(),

    currency: z.literal('VND').optional(),

    attributes: z.record(z.string(), z.string()).optional(),

    sortOrder: z.number().int().min(0).optional(),

    expectedVersion: z.number().int().min(1),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), {
    message: 'At least one variant field must be updated',
  });

type RouteContext = {
  params: Promise<{
    productId: string;
    variantId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { productId, variantId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  try {
    const { data } = await serverApi.get(
      `/api/v1/admin/products/${productId}/variants/${variantId}`,
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId, variantId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = updateVariantSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.patch(
      `/api/v1/admin/products/${productId}/variants/${variantId}`,
      parsed.data,
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId, variantId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const parsedVersion = z.coerce
    .number()
    .int()
    .min(1)
    .safeParse(request.nextUrl.searchParams.get('expectedVersion'));

  if (!parsedVersion.success) {
    return createValidationResponse(parsedVersion.error.flatten());
  }

  try {
    const { data } = await serverApi.delete(
      `/api/v1/admin/products/${productId}/variants/${variantId}`,
      {
        params: {
          expectedVersion: parsedVersion.data,
        },
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
