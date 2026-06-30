// apps/web/src/app/api/admin/inventory/warehouses/route.ts

import { proxyAdminGet, proxyAdminJsonMutation } from '@/lib/http/admin-route-proxy';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),

  name: z.string().trim().min(2).max(160),
});

export function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/v1/admin/inventory/warehouses');
}

export function POST(request: NextRequest) {
  return proxyAdminJsonMutation(request, {
    backendPath: '/api/v1/admin/inventory/warehouses',

    method: 'post',
    schema: createWarehouseSchema,

    successStatus: 201,
  });
}
