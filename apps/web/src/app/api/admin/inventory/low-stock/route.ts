// apps/web/src/app/api/admin/inventory/low-stock/route.ts

import { proxyAdminGet } from '@/lib/http/admin-route-proxy';
import { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/v1/admin/inventory/low-stock');
}
