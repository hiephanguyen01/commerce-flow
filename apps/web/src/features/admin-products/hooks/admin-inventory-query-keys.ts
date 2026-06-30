export const adminInventoryQueryKeys = {
  all: ['admin-inventory'] as const,

  items: (query: string) => [...adminInventoryQueryKeys.all, 'items', query] as const,

  lowStock: (query: string) => [...adminInventoryQueryKeys.all, 'low-stock', query] as const,

  movements: (query: string) => [...adminInventoryQueryKeys.all, 'movements', query] as const,

  warehouses: () => [...adminInventoryQueryKeys.all, 'warehouses'] as const,
};
