import 'server-only';

import axios, { AxiosInstance } from 'axios';

type CreateServerApiOptions = {
  accessToken?: string;
  requestId?: string;
};

export function createServerApi(options: CreateServerApiOptions = {}): AxiosInstance {
  const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://localhost:4000';

  if (!apiInternalUrl) {
    throw new Error('API_INTERNAL_URL is not configured');
  }

  return axios.create({
    baseURL: apiInternalUrl,
    timeout: 10_000,

    headers: {
      Accept: 'application/json',

      ...(options.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`,
          }
        : {}),
      ...(options.requestId
        ? {
            'x-request-id': options.requestId,
          }
        : {}),
    },
  });
}
