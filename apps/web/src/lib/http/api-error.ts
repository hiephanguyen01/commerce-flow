import axios from 'axios';

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  requestId?: string;
};

export type ParsedApiError = {
  status?: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export function parseApiError(error: unknown): ParsedApiError {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return {
      status: error.response?.status,

      code: error.response?.data?.error?.code ?? error.code ?? 'REQUEST_FAILED',

      message: error.response?.data?.error?.message ?? getFallbackMessage(error.response?.status),

      details: error.response?.data?.error?.details,

      requestId: error.response?.data?.requestId ?? error.response?.headers['x-request-id'],
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}

function getFallbackMessage(status: number | undefined): string {
  switch (status) {
    case 400:
      return 'Request data is invalid';

    case 401:
      return 'Authentication is required';

    case 403:
      return 'You do not have permission';

    case 404:
      return 'Resource was not found';

    case 409:
      return 'Request conflicts with current data';

    case 422:
      return 'Business validation failed';

    case 423:
      return 'Account is temporarily locked';

    case 429:
      return 'Too many requests';

    default:
      return status && status >= 500
        ? 'The server is temporarily unavailable'
        : 'The request could not be completed';
  }
}
