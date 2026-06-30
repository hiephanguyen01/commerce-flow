import { browserApi } from '@/lib/http/browser-api';
import type {
  AdminInventoryItem,
  AdminWarehouse,
  InventoryItemsResponse,
  InventoryMovementsResponse,
  WarehousesResponse,
} from '../types/admin-inventory';

export async function getInventoryItems(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<InventoryItemsResponse> {
  const { data } = await browserApi.get<InventoryItemsResponse>(
    `/admin/inventory/items?${searchParams.toString()}`,
    {
      signal,
    },
  );

  return data;
}

export async function getLowStockItems(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<InventoryItemsResponse> {
  const { data } = await browserApi.get<InventoryItemsResponse>(
    `/admin/inventory/low-stock?${searchParams.toString()}`,
    {
      signal,
    },
  );

  return data;
}

export async function getInventoryMovements(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<InventoryMovementsResponse> {
  const { data } = await browserApi.get<InventoryMovementsResponse>(
    `/admin/inventory/movements?${searchParams.toString()}`,
    {
      signal,
    },
  );

  return data;
}

export async function getWarehouses(signal?: AbortSignal): Promise<WarehousesResponse> {
  const { data } = await browserApi.get<WarehousesResponse>(
    '/admin/inventory/warehouses?page=1&limit=100',
    {
      signal,
    },
  );

  return data;
}

export async function adjustInventory(input: {
  warehouseId: string;
  variantId: string;
  quantityDelta: number;
  expectedVersion: number;
  reason: string;
  referenceId?: string;
}) {
  const { data } = await browserApi.post('/admin/inventory/adjustments', {
    ...input,

    idempotencyKey: crypto.randomUUID(),
  });

  return data;
}

export async function updateWarehouseStatus(
  warehouse: AdminWarehouse,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<AdminWarehouse> {
  const { data } = await browserApi.patch<AdminWarehouse>(
    `/admin/inventory/warehouses/${warehouse.id}/status`,
    {
      status,

      expectedVersion: warehouse.version,
    },
  );

  return data;
}

export type { AdminInventoryItem };
