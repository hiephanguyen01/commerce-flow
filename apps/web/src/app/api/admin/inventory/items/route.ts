// apps/web/src/app/api/admin/inventory/items/route.ts

import { proxyAdminGet } from '@/lib/http/admin-route-proxy';
import { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/v1/admin/inventory/items');
}
export {};
