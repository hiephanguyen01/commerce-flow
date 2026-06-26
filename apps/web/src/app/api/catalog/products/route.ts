import { createRouteErrorResponse } from '@/lib/http/route-error';
import { createServerApi } from '@/lib/http/server-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  search: z.string().trim().max(200).optional(),
  categorySlug: z
    .string()
    .trim()
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sort: z.enum(['newest', 'name_asc', 'name_desc']).default('newest'),
});
export async function GET(request: NextRequest) {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Catalog query is invalid',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const serverApi = createServerApi();
  try {
    const { data } = await serverApi.get('/api/v1/catalog/products', { params: parsed.data });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    return createRouteErrorResponse(error);
  }
}
