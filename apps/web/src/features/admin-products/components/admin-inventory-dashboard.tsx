'use client';

import { useMemo, useState } from 'react';
import {
  useInventoryItems,
  useInventoryMovements,
  useLowStockItems,
} from '../hooks/use-admin-inventory';
import type { AdminInventoryItem } from '../types/admin-inventory';
import { InventoryAdjustmentForm } from './inventory-adjustment-form';

type InventoryTab = 'items' | 'low-stock' | 'movements';

export function AdminInventoryDashboard() {
  const [tab, setTab] = useState<InventoryTab>('items');

  const [selectedItem, setSelectedItem] = useState<AdminInventoryItem | null>(null);

  const itemParams = useMemo(() => {
    const params = new URLSearchParams();

    params.set('page', '1');
    params.set('limit', '50');

    return params;
  }, []);

  const lowStockParams = useMemo(() => {
    const params = new URLSearchParams();

    params.set('page', '1');
    params.set('limit', '50');
    params.set('threshold', '10');

    return params;
  }, []);

  const movementParams = useMemo(() => {
    const params = new URLSearchParams();

    params.set('page', '1');
    params.set('limit', '50');

    return params;
  }, []);

  const itemsQuery = useInventoryItems(itemParams);

  const lowStockQuery = useLowStockItems(lowStockParams);

  const movementsQuery = useInventoryMovements(movementParams);

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-indigo-600">Inventory</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Quản lý tồn kho
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Theo dõi on-hand, reserved, available và lịch sử biến động.
        </p>
      </header>

      <nav className="mt-8 flex overflow-x-auto border-b border-slate-200">
        <TabButton
          active={tab === 'items'}
          onClick={() => {
            setTab('items');
          }}
        >
          Tồn kho
        </TabButton>

        <TabButton
          active={tab === 'low-stock'}
          onClick={() => {
            setTab('low-stock');
          }}
        >
          Sắp hết hàng
        </TabButton>

        <TabButton
          active={tab === 'movements'}
          onClick={() => {
            setTab('movements');
          }}
        >
          Biến động
        </TabButton>
      </nav>

      {selectedItem ? (
        <div className="mt-6">
          <InventoryAdjustmentForm
            item={selectedItem}
            onClose={() => {
              setSelectedItem(null);
            }}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {tab === 'items' ? (
          <InventoryTable
            items={itemsQuery.data?.items ?? []}
            pending={itemsQuery.isPending}
            onAdjust={setSelectedItem}
          />
        ) : null}

        {tab === 'low-stock' ? (
          <InventoryTable
            items={lowStockQuery.data?.items ?? []}
            pending={lowStockQuery.isPending}
            onAdjust={setSelectedItem}
          />
        ) : null}

        {tab === 'movements' ? (
          <MovementTable
            movements={movementsQuery.data?.items ?? []}
            pending={movementsQuery.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}

function InventoryTable({
  items,
  pending,
  onAdjust,
}: {
  items: AdminInventoryItem[];
  pending: boolean;
  onAdjust: (item: AdminInventoryItem) => void;
}) {
  if (pending) {
    return <TableSkeleton />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <TableHeader>Sản phẩm</TableHeader>

            <TableHeader>Kho</TableHeader>

            <TableHeader>On hand</TableHeader>

            <TableHeader>Reserved</TableHeader>

            <TableHeader>Available</TableHeader>

            <TableHeader>Version</TableHeader>

            <TableHeader>Thao tác</TableHeader>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <p className="font-medium text-slate-950">{item.variant.product.name}</p>

                <p className="mt-1 text-sm text-slate-500">{item.variant.name}</p>

                <p className="mt-1 font-mono text-xs text-slate-400">{item.variant.sku}</p>
              </td>

              <td className="px-5 py-4 text-sm text-slate-700">{item.warehouse.code}</td>

              <NumberCell value={item.onHand} />

              <NumberCell value={item.reserved} />

              <td className="px-5 py-4">
                <span
                  className={[
                    'inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-sm font-semibold',
                    item.available <= 0
                      ? 'bg-red-50 text-red-700'
                      : item.available <= 10
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700',
                  ].join(' ')}
                >
                  {item.available}
                </span>
              </td>

              <NumberCell value={item.version} />

              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    onAdjust(item);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Điều chỉnh
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementTable({
  movements,
  pending,
}: {
  movements: Array<{
    id: string;
    type: string;
    deltaOnHand: number;
    deltaReserved: number;
    balanceOnHandAfter: number;
    balanceReservedAfter: number;
    referenceId: string | null;
    note: string | null;
    createdAt: string;

    inventoryItem: {
      warehouse: {
        code: string;
      };

      variant: {
        sku: string;

        product: {
          name: string;
        };
      };
    };
  }>;

  pending: boolean;
}) {
  if (pending) {
    return <TableSkeleton />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <TableHeader>Thời gian</TableHeader>

            <TableHeader>Sản phẩm</TableHeader>

            <TableHeader>Loại</TableHeader>

            <TableHeader>Δ On hand</TableHeader>

            <TableHeader>Δ Reserved</TableHeader>

            <TableHeader>Balance</TableHeader>

            <TableHeader>Ghi chú</TableHeader>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                {new Intl.DateTimeFormat('vi-VN', {
                  dateStyle: 'short',

                  timeStyle: 'short',
                }).format(new Date(movement.createdAt))}
              </td>

              <td className="px-5 py-4">
                <p className="text-sm font-medium text-slate-900">
                  {movement.inventoryItem.variant.product.name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-400">
                  {movement.inventoryItem.variant.sku}
                  {' · '}
                  {movement.inventoryItem.warehouse.code}
                </p>
              </td>

              <td className="px-5 py-4 text-xs font-semibold text-slate-700">{movement.type}</td>

              <SignedNumber value={movement.deltaOnHand} />

              <SignedNumber value={movement.deltaReserved} />

              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                {movement.balanceOnHandAfter}
                {' / '}
                {movement.balanceReservedAfter}
              </td>

              <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                {movement.note ?? movement.referenceId ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignedNumber({ value }: { value: number }) {
  return (
    <td
      className={[
        'whitespace-nowrap px-5 py-4 text-sm font-semibold',
        value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-slate-400',
      ].join(' ')}
    >
      {value > 0 ? '+' : ''}
      {value}
    </td>
  );
}

function NumberCell({ value }: { value: number }) {
  return <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{value}</td>;
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border-b-2 px-4 py-3 text-sm font-semibold',
        active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
