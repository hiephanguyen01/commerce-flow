import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';

export function createAdminRouteApi(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  return createServerApi({
    accessToken,

    requestId: request.headers.get('x-request-id') ?? undefined,
  });
}

export function createUnauthenticatedResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required',
      },
    },
    {
      status: 401,
    },
  );
}

export function createInvalidOriginResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'INVALID_ORIGIN',
        message: 'Invalid request origin',
      },
    },
    {
      status: 403,
    },
  );
}

export function createValidationResponse(details: unknown) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request data is invalid',
        details,
      },
    },
    {
      status: 400,
    },
  );
}
