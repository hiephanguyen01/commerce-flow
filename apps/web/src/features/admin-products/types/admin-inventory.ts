export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export type InventoryMovementType =
  | 'STOCK_RECEIVED'
  | 'STOCK_ADJUSTED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_RELEASED'
  | 'RESERVATION_COMMITTED'
  | 'RESERVATION_EXPIRED';

export type AdminWarehouse = {
  id: string;
  code: string;
  name: string;
  status: WarehouseStatus;
  version: number;
  createdAt: string;
  updatedAt: string;

  _count: {
    inventoryItems: number;
  };
};

export type AdminInventoryItem = {
  id: string;
  warehouseId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  createdAt: string;
  updatedAt: string;

  warehouse: {
    id: string;
    code: string;
    name: string;
    status: WarehouseStatus;
  };

  variant: {
    id: string;
    name: string;
    sku: string;
    status: 'ACTIVE' | 'INACTIVE';

    product: {
      id: string;
      name: string;
      slug: string;
      status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    };
  };
};

export type AdminInventoryMovement = {
  id: string;
  inventoryItemId: string;
  reservationId: string | null;
  type: InventoryMovementType;
  deltaOnHand: number;
  deltaReserved: number;
  balanceOnHandAfter: number;
  balanceReservedAfter: number;
  idempotencyKey: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;

  inventoryItem: {
    warehouse: {
      id: string;
      code: string;
      name: string;
    };

    variant: {
      id: string;
      name: string;
      sku: string;

      product: {
        id: string;
        name: string;
        slug: string;
      };
    };
  };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryItemsResponse = {
  items: AdminInventoryItem[];
  pagination: Pagination;
};

export type WarehousesResponse = {
  items: AdminWarehouse[];
  pagination: Pagination;
};

export type InventoryMovementsResponse = {
  items: AdminInventoryMovement[];
  pagination: Pagination;
};
