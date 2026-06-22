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

const reorderSchema = z.object({
  imageIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((imageIds) => new Set(imageIds).size === imageIds.length, {
      message: 'Image IDs must be unique',
    }),

  expectedProductVersion: z.number().int().min(1),
});

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = reorderSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.put(
      `/api/v1/admin/products/${productId}/images/reorder`,
      parsed.data,
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
