import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextResponse } from 'next/server';
export async function GET() {
  const serverApi = createServerApi();
  try {
    const { data } = await serverApi.get('/api/v1/catalog/categories');
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
