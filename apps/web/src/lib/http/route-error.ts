import axios from 'axios';
import { NextResponse } from 'next/server';

export function createRouteErrorResponse(error: unknown): NextResponse {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const body = error.response.data ?? {
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Backend request failed',
        },
      };

      return NextResponse.json(body, {
        status: error.response.status,
      });
    }

    if (error.code === 'ECONNABORTED') {
      return NextResponse.json(
        {
          error: {
            code: 'UPSTREAM_TIMEOUT',
            message: 'Backend request timed out',
          },
        },
        {
          status: 504,
        },
      );
    }
  }

  return NextResponse.json(
    {
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Backend service is unavailable',
      },
    },
    {
      status: 503,
    },
  );
}
