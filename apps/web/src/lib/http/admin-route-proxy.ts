import { isSameOrigin } from '@/lib/auth/same-origin';
import {
  createAdminRouteApi,
  createInvalidOriginResponse,
  createUnauthenticatedResponse,
  createValidationResponse,
} from '@/lib/http/admin-route-api';
import { createRouteErrorResponse } from '@/lib/http/route-error';
import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export async function proxyAdminGet(request: NextRequest, backendPath: string) {
  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  try {
    const { data } = await serverApi.get(backendPath, {
      params: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });

    return NextResponse.json(data);
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}

export async function proxyAdminJsonMutation<T>(
  request: NextRequest,
  options: {
    backendPath: string;
    method: 'post' | 'patch' | 'put';
    schema: ZodType<T>;
    successStatus?: number;
  },
) {
  if (!isSameOrigin(request)) {
    return createInvalidOriginResponse();
  }

  const serverApi = createAdminRouteApi(request);

  if (!serverApi) {
    return createUnauthenticatedResponse();
  }

  const body = await request.json().catch(() => null);

  const parsed = options.schema.safeParse(body);

  if (!parsed.success) {
    return createValidationResponse(parsed.error.flatten());
  }

  try {
    const { data } = await serverApi.request({
      method: options.method,
      url: options.backendPath,
      data: parsed.data,
    });

    return NextResponse.json(data, {
      status: options.successStatus ?? 200,
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
