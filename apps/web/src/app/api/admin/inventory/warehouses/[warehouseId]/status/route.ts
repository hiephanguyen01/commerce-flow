// apps/web/src/app/api/admin/inventory/warehouses/[warehouseId]/status/route.ts

import { proxyAdminJsonMutation } from '@/lib/http/admin-route-proxy';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),

  expectedVersion: z.number().int().min(1),
});

type RouteContext = {
  params: Promise<{
    warehouseId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { warehouseId } = await context.params;

  return proxyAdminJsonMutation(request, {
    backendPath: `/api/v1/admin/inventory/warehouses/${warehouseId}/status`,

    method: 'patch',
    schema: statusSchema,
  });
}
