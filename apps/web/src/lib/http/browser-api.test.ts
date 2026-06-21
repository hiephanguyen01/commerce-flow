import { mockServer } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { browserApi } from './browser-api';

describe('browserApi', () => {
  it('refreshes and retries a protected request', async () => {
    let authenticated = false;
    let refreshCount = 0;

    mockServer.use(
      http.get('*/api/test/protected', () => {
        if (!authenticated) {
          return HttpResponse.json(
            {
              error: {
                code: 'ACCESS_TOKEN_EXPIRED',
              },
            },
            {
              status: 401,
            },
          );
        }

        return HttpResponse.json({
          success: true,
        });
      }),

      http.post('*/api/auth/refresh', () => {
        refreshCount += 1;
        authenticated = true;

        return HttpResponse.json({
          success: true,
        });
      }),
    );

    const response = await browserApi.get<{
      success: boolean;
    }>('/test/protected');

    expect(response.data.success).toBe(true);

    expect(refreshCount).toBe(1);
  });

  it('uses one refresh request for concurrent 401 responses', async () => {
    let authenticated = false;
    let refreshCount = 0;

    mockServer.use(
      http.get('*/api/test/protected', () => {
        if (!authenticated) {
          return new HttpResponse(null, {
            status: 401,
          });
        }

        return HttpResponse.json({
          success: true,
        });
      }),

      http.post('*/api/auth/refresh', async () => {
        refreshCount += 1;

        await new Promise((resolve) => setTimeout(resolve, 20));

        authenticated = true;

        return HttpResponse.json({
          success: true,
        });
      }),
    );

    await Promise.all([
      browserApi.get('/test/protected'),
      browserApi.get('/test/protected'),
      browserApi.get('/test/protected'),
    ]);

    expect(refreshCount).toBe(1);
  });

  it('does not refresh when login returns 401', async () => {
    let refreshCount = 0;

    mockServer.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
            },
          },
          {
            status: 401,
          },
        ),
      ),

      http.post('*/api/auth/refresh', () => {
        refreshCount += 1;

        return HttpResponse.json({});
      }),
    );

    await expect(
      browserApi.post('/auth/login', {
        email: 'customer@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeDefined();

    expect(refreshCount).toBe(0);
  });
});
