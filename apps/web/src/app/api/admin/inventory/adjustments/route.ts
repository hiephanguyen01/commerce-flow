// apps/web/src/app/api/admin/inventory/adjustments/route.ts

import { proxyAdminJsonMutation } from '@/lib/http/admin-route-proxy';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const adjustmentSchema = z.object({
  warehouseId: z.string().uuid(),

  variantId: z.string().uuid(),

  quantityDelta: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((value) => value !== 0, {
      message: 'Quantity delta cannot be zero',
    }),

  expectedVersion: z.number().int().min(1),

  reason: z.string().trim().min(3).max(500),

  idempotencyKey: z.string().trim().min(1).max(120),

  referenceId: z.string().trim().max(120).optional(),
});

export function POST(request: NextRequest) {
  return proxyAdminJsonMutation(request, {
    backendPath: '/api/v1/admin/inventory/adjustments',

    method: 'post',
    schema: adjustmentSchema,
  });
}
