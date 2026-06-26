import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const slugSchema = z
  .string()
  .min(2)
  .max(220)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
type RouteContext = { params: Promise<{ slug: string }> };
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Product slug is invalid' } },
      { status: 400 },
    );
  }
  const serverApi = createServerApi();
  try {
    const { data } = await serverApi.get(
      `/api/v1/catalog/products/${encodeURIComponent(parsed.data)}`,
    );
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
