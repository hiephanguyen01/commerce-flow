// Empty file
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

const versionSchema = z.object({
  expectedProductVersion: z.number().int().min(1),
});

type RouteContext = {
  params: Promise<{
    productId: string;
    imageId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const { productId, imageId } = await context.params;

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = versionSchema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.post(
      `/api/v1/admin/products/${productId}/images/${imageId}/primary`,
      parsed.data,
    );

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
