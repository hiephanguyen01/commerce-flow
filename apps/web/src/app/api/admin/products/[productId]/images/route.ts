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

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadMetadataSchema = z.object({
  altText: z.string().trim().max(250).nullable(),

  isPrimary: z.enum(['true', 'false']).transform((value) => value === 'true'),

  sortOrder: z.coerce.number().int().min(0),

  expectedProductVersion: z.coerce.number().int().min(1),
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
    const { data } = await serverApi.get(`/api/v1/admin/products/${productId}/images`);

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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return createValidationResponse({
      form: ['Multipart form data is invalid'],
    });
  }

  const fileValue = formData.get('file');

  if (!(fileValue instanceof File)) {
    return createValidationResponse({
      file: ['Product image file is required'],
    });
  }

  if (fileValue.size <= 0 || fileValue.size > MAX_IMAGE_SIZE) {
    return createValidationResponse({
      file: ['Product image must be between 1 byte and 5 MB'],
    });
  }

  if (!allowedMimeTypes.has(fileValue.type)) {
    return createValidationResponse({
      file: ['Only JPEG, PNG and WebP are supported'],
    });
  }

  const rawAltText = formData.get('altText');

  const parsed = uploadMetadataSchema.safeParse({
    altText: typeof rawAltText === 'string' && rawAltText.trim().length > 0 ? rawAltText : null,

    isPrimary: formData.get('isPrimary') ?? 'false',

    sortOrder: formData.get('sortOrder') ?? '0',

    expectedProductVersion: formData.get('expectedProductVersion'),
  });

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  const outbound = new FormData();

  outbound.append('file', fileValue, fileValue.name);

  outbound.append('altText', parsed.data.altText ?? '');

  outbound.append('isPrimary', String(parsed.data.isPrimary));

  outbound.append('sortOrder', String(parsed.data.sortOrder));

  outbound.append('expectedProductVersion', String(parsed.data.expectedProductVersion));

  try {
    /*
     * Không tự đặt Content-Type.
     * Axios sẽ tự tạo multipart boundary.
     */
    const { data } = await serverApi.post(`/api/v1/admin/products/${productId}/images`, outbound, {
      maxBodyLength: MAX_IMAGE_SIZE + 1024 * 1024,
    });

    return NextResponse.json(data, {
      status: 201,
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
