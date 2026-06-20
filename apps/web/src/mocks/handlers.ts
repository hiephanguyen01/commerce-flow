import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:4000/api/v1/health/live', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: '2026-06-20T00:00:00.000Z',
    });
  }),
];
