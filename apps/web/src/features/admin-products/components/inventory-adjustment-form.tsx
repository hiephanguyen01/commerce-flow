'use client';

import { parseApiError } from '@/lib/http/api-error';
import { useState, type FormEvent } from 'react';
import { useAdjustInventory } from '../hooks/use-admin-inventory';
import type { AdminInventoryItem } from '../types/admin-inventory';

type InventoryAdjustmentFormProps = {
  item: AdminInventoryItem;
  onClose: () => void;
};

export function InventoryAdjustmentForm({ item, onClose }: InventoryAdjustmentFormProps) {
  const mutation = useAdjustInventory();

  const [quantityDelta, setQuantityDelta] = useState('');

  const [reason, setReason] = useState('');

  const [referenceId, setReferenceId] = useState('');

  const parsedError = mutation.error ? parseApiError(mutation.error) : null;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    const parsedQuantity = Number(quantityDelta);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      return;
    }

    try {
      await mutation.mutateAsync({
        warehouseId: item.warehouseId,

        variantId: item.variantId,

        quantityDelta: parsedQuantity,

        expectedVersion: item.version,

        reason: reason.trim(),

        ...(referenceId.trim()
          ? {
              referenceId: referenceId.trim(),
            }
          : {}),
      });

      onClose();
    } catch {
      // Hiển thị bằng mutation state.
    }
  }

  const resultingOnHand = item.onHand + (Number(quantityDelta) || 0);

  const invalidDecrease = resultingOnHand < item.reserved;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5"
    >
      <div>
        <h3 className="font-semibold text-slate-950">Điều chỉnh tồn kho</h3>

        <p className="mt-1 text-sm text-slate-500">
          {item.variant.product.name}
          {' — '}
          {item.variant.name}
        </p>

        <p className="mt-1 font-mono text-xs text-slate-400">{item.variant.sku}</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Balance label="On hand" value={item.onHand} />

        <Balance label="Reserved" value={item.reserved} />

        <Balance label="Available" value={item.available} />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Số lượng điều chỉnh</span>

          <input
            type="number"
            value={quantityDelta}
            onChange={(event) => {
              setQuantityDelta(event.target.value);
            }}
            placeholder="Ví dụ: 10 hoặc -3"
            className={inputClass}
          />

          <span className="mt-1.5 block text-xs text-slate-500">Dương để tăng, âm để giảm.</span>
        </label>

        <label>
          <span className={labelClass}>Mã tham chiếu</span>

          <input
            value={referenceId}
            maxLength={120}
            onChange={(event) => {
              setReferenceId(event.target.value);
            }}
            placeholder="STOCKTAKE-2026-06"
            className={inputClass}
          />
        </label>

        <label className="sm:col-span-2">
          <span className={labelClass}>Lý do điều chỉnh</span>

          <textarea
            value={reason}
            minLength={3}
            maxLength={500}
            rows={3}
            required
            onChange={(event) => {
              setReason(event.target.value);
            }}
            placeholder="Mô tả lý do thay đổi số lượng tồn kho"
            className={inputClass}
          />
        </label>
      </div>

      {quantityDelta ? (
        <div
          className={[
            'mt-5 rounded-xl border p-4 text-sm',
            invalidDecrease
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700',
          ].join(' ')}
        >
          On hand sau điều chỉnh: <strong>{resultingOnHand}</strong>
          {invalidDecrease ? (
            <p className="mt-1">Không thể thấp hơn reserved ({item.reserved}).</p>
          ) : null}
        </div>
      ) : null}

      {parsedError ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {getAdjustmentError(parsedError.code, parsedError.message)}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className={secondaryButtonClass}
        >
          Hủy
        </button>

        <button
          type="submit"
          disabled={
            mutation.isPending || invalidDecrease || !reason.trim() || Number(quantityDelta) === 0
          }
          className={primaryButtonClass}
        >
          {mutation.isPending ? 'Đang cập nhật...' : 'Xác nhận điều chỉnh'}
        </button>
      </div>
    </form>
  );
}

function Balance({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>

      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getAdjustmentError(code: string, fallback: string): string {
  switch (code) {
    case 'INVENTORY_VERSION_CONFLICT':
      return 'Tồn kho đã thay đổi bởi một yêu cầu khác. Hãy tải lại dữ liệu.';

    case 'INVENTORY_ADJUSTMENT_BELOW_RESERVED':
      return 'Không thể giảm on-hand thấp hơn lượng hàng đang được giữ.';

    case 'IDEMPOTENCY_KEY_REUSED':
      return 'Mã idempotency đã được dùng cho một thao tác khác.';

    case 'INVENTORY_ITEM_NOT_FOUND':
      return 'Không tìm thấy inventory item.';

    default:
      return fallback;
  }
}

const labelClass = 'mb-2 block text-sm font-medium text-slate-700';

const inputClass = [
  'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5',
  'text-sm text-slate-950 outline-none',
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
].join(' ');

const primaryButtonClass = [
  'h-11 rounded-xl bg-slate-950 px-5',
  'text-sm font-semibold text-white',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const secondaryButtonClass = [
  'h-11 rounded-xl border border-slate-300 bg-white px-5',
  'text-sm font-semibold text-slate-700',
  'disabled:opacity-50',
].join(' ');
