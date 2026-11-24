"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { isApiError } from "@/lib/utils/errors";
import { useReceivePurchaseOrderMutation } from "@/services/api/endpoints/purchaseOrdersApi";
import type { PurchaseOrder } from "@/types/models";

/** Records a full or partial delivery against an approved purchase order. */
export function ReceiveDialog({ order, open, onClose }: { order: PurchaseOrder; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [receive, { isLoading }] = useReceivePurchaseOrderMutation();
  const outstanding = (item: PurchaseOrder["items"][number]) => item.quantity - item.receivedQuantity;
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((item) => [item.productId, String(outstanding(item))])),
  );
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const onSubmit = async () => {
    setFieldErrors({});
    const items = order.items.map((item) => ({ productId: item.productId, quantity: Number(quantities[item.productId] || 0) }));
    try {
      const saved = await receive({ id: order.id, items, notes: notes || undefined }).unwrap();
      toast.success(saved.status === "received" ? "Delivery received in full" : "Partial delivery recorded", `${saved.poNumber}: stock updated at ${saved.warehouseName}.`);
      onClose();
    } catch (error) {
      if (isApiError(error) && error.errors) setFieldErrors(error.errors);
      else toast.error("Could not record delivery", error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Receive ${order.poNumber}`}
      description={`Enter the quantities delivered to ${order.warehouseName}. Stock is added immediately.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={onSubmit} loading={isLoading}>Post receipt</Button>
        </>
      }
    >
      {fieldErrors.items && <p role="alert" className="mb-3 text-sm text-red-600">{fieldErrors.items[0]}</p>}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {order.items.map((item, index) => {
          const remaining = outstanding(item);
          const error = fieldErrors[`items.${index}.quantity`]?.[0];
          return (
            <li key={item.productId} className="flex items-center gap-3 p-3">
              <label htmlFor={`receive-${item.productId}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.productName}</span>
                <span className="text-xs text-muted">Ordered {item.quantity} · received {item.receivedQuantity} · outstanding {remaining} {item.unit}</span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
              </label>
              <Input
                id={`receive-${item.productId}`}
                type="number"
                min={0}
                max={remaining}
                disabled={remaining === 0}
                value={quantities[item.productId]}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.productId]: event.target.value }))}
                className="w-24 text-right"
              />
            </li>
          );
        })}
      </ul>
      <label htmlFor="receive-notes" className="mt-4 block text-sm font-medium">Delivery notes</label>
      <Input id="receive-notes" className="mt-1.5" placeholder="e.g. DR# 004512, 2 boxes slightly dented" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </Modal>
  );
}
