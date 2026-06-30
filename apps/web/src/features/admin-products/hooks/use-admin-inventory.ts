'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adjustInventory,
  getInventoryItems,
  getInventoryMovements,
  getLowStockItems,
  getWarehouses,
  updateWarehouseStatus,
} from '../api/admin-inventory-api';
import type { AdminWarehouse } from '../types/admin-inventory';
import { adminInventoryQueryKeys } from './admin-inventory-query-keys';

export function useInventoryItems(searchParams: URLSearchParams) {
  const query = searchParams.toString();

  return useQuery({
    queryKey: adminInventoryQueryKeys.items(query),

    queryFn: ({ signal }) => getInventoryItems(searchParams, signal),

    placeholderData: keepPreviousData,
  });
}

export function useLowStockItems(searchParams: URLSearchParams) {
  const query = searchParams.toString();

  return useQuery({
    queryKey: adminInventoryQueryKeys.lowStock(query),

    queryFn: ({ signal }) => getLowStockItems(searchParams, signal),

    placeholderData: keepPreviousData,
  });
}

export function useInventoryMovements(searchParams: URLSearchParams) {
  const query = searchParams.toString();

  return useQuery({
    queryKey: adminInventoryQueryKeys.movements(query),

    queryFn: ({ signal }) => getInventoryMovements(searchParams, signal),

    placeholderData: keepPreviousData,
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: adminInventoryQueryKeys.warehouses(),

    queryFn: ({ signal }) => getWarehouses(signal),

    staleTime: 60_000,
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adjustInventory,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminInventoryQueryKeys.all,
      });
    },
  });
}

export function useUpdateWarehouseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      warehouse,
      status,
    }: {
      warehouse: AdminWarehouse;

      status: 'ACTIVE' | 'INACTIVE';
    }) => updateWarehouseStatus(warehouse, status),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminInventoryQueryKeys.all,
      });
    },
  });
}
