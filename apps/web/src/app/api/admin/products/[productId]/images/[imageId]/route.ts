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

const updateImageSchema = z
  .object({
    altText: z.string().trim().max(250).nullable().optional(),

    sortOrder: z.number().int().min(0).optional(),

    expectedProductVersion: z.number().int().min(1),
  })
  .refine((value) => value.altText !== undefined || value.sortOrder !== undefined, {
    message: 'At least one image field must be updated',
  });

type RouteContext = {
  params: Promise<{
    productId: string;
    imageId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId, imageId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = updateImageSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.patch(
      `/api/v1/admin/products/${productId}/images/${imageId}`,
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

  const { productId, imageId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const parsedVersion = z.coerce
    .number()
    .int()
    .min(1)
    .safeParse(request.nextUrl.searchParams.get('expectedProductVersion'));

  if (!parsedVersion.success) {
    return createValidationResponse(parsedVersion.error.flatten());
  }

  try {
    const { data } = await serverApi.delete(
      `/api/v1/admin/products/${productId}/images/${imageId}`,
      {
        params: {
          expectedProductVersion: parsedVersion.data,
        },
      },
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
