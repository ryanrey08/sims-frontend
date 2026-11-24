"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { formatCurrency, todayISO } from "@/lib/utils/format";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useCreatePurchaseOrderMutation, useUpdatePurchaseOrderMutation } from "@/services/api/endpoints/purchaseOrdersApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { PurchaseOrder } from "@/types/models";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "../schemas/purchaseOrderSchema";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function PurchaseOrderFormInner({ order }: { order?: PurchaseOrder }) {
  const router = useRouter();
  const toast = useToast();
  const presetSupplier = useSearchParams().get("supplierId") ?? "";
  const isEdit = Boolean(order);
  const [createOrder, createState] = useCreatePurchaseOrderMutation();
  const [updateOrder, updateState] = useUpdatePurchaseOrderMutation();
  const { data: suppliers } = useGetSuppliersQuery({ status: "active", pageSize: 100, sortBy: "name" });
  const { data: warehouses } = useGetWarehousesQuery({ status: "active", pageSize: 100 });
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name" });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: order
      ? { ...order, notes: order.notes ?? "", items: order.items.map(({ productId, quantity, unitCost }) => ({ productId, quantity, unitCost })) }
      : { supplierId: presetSupplier, warehouseId: "", orderDate: todayISO(), expectedDate: addDays(todayISO(), 5), notes: "", items: [{ productId: "", quantity: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const supplierId = useWatch({ control, name: "supplierId" });
  const total = (items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);

  const productOptions = (products?.data ?? []).map((item) => ({
    label: `${item.sku} — ${item.name}${item.preferredSupplierId === supplierId ? " ★" : ""}`,
    value: item.id,
  }));

  /** Prefill cost (and a sensible quantity) from the product master when a product is chosen. */
  const onProductChange = (index: number, productId: string) => {
    const product = products?.data.find((item) => item.id === productId);
    if (!product) return;
    setValue(`items.${index}.unitCost`, product.unitCost, { shouldValidate: true });
    if ((getValues(`items.${index}.quantity`) ?? 0) <= 1) setValue(`items.${index}.quantity`, product.reorderQuantity, { shouldValidate: true });
  };

  /** Adds every low-stock product from this supplier as lines. */
  const addSuggested = () => {
    const suggested = (products?.data ?? []).filter(
      (item) => item.preferredSupplierId === supplierId && item.stockStatus !== "in-stock" && !items.some((line) => line.productId === item.id),
    );
    if (!suggested.length) {
      toast.info("Nothing to suggest", "No low-stock products from this supplier.");
      return;
    }
    const blanks = items.map((line, index) => (line.productId ? -1 : index)).filter((index) => index >= 0);
    remove(blanks);
    suggested.forEach((item) => append({ productId: item.id, quantity: item.reorderQuantity, unitCost: item.unitCost }));
  };

  const submit = (status: "draft" | "pending") =>
    handleSubmit(async (values) => {
      const body = { ...values, notes: values.notes || undefined, status };
      try {
        const saved = order ? await updateOrder({ id: order.id, body }).unwrap() : await createOrder(body).unwrap();
        toast.success(status === "pending" ? "Submitted for approval" : "Draft saved", saved.poNumber);
        router.push(`/purchase-orders/${saved.id}`);
      } catch (error) {
        if (!applyServerErrors(error, setError)) toast.error("Could not save purchase order", error);
      }
    });

  const err = (name: "supplierId" | "warehouseId" | "orderDate" | "expectedDate" | "notes") => errors[name]?.message;
  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${order?.poNumber}` : "New purchase order"} description="Choose a supplier, the receiving warehouse and the items to order." />
      <Card>
        <form onSubmit={submit("pending")} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Order details">
                <FormField label="Supplier" htmlFor="supplierId" required error={err("supplierId")}>
                  <Select placeholder="Select a supplier" options={(suppliers?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...fieldA11y("supplierId", err("supplierId"))} {...register("supplierId")} />
                </FormField>
                <FormField label="Deliver to" htmlFor="warehouseId" required error={err("warehouseId")}>
                  <Select placeholder="Select a warehouse" options={(warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...fieldA11y("warehouseId", err("warehouseId"))} {...register("warehouseId")} />
                </FormField>
                <FormField label="Order date" htmlFor="orderDate" required error={err("orderDate")}>
                  <Input type="date" {...fieldA11y("orderDate", err("orderDate"))} {...register("orderDate")} />
                </FormField>
                <FormField label="Expected delivery" htmlFor="expectedDate" required error={err("expectedDate")}>
                  <Input type="date" {...fieldA11y("expectedDate", err("expectedDate"))} {...register("expectedDate")} />
                </FormField>
                <FormField label="Notes" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
                  <Textarea rows={2} placeholder="Delivery instructions, quotation reference…" {...fieldA11y("notes", err("notes"))} {...register("notes")} />
                </FormField>
              </FormSection>
            </div>
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Line items <span className="text-red-600">*</span></h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addSuggested} disabled={!supplierId}>Add low-stock items</Button>
                  <Button variant="secondary" size="sm" onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })} leftIcon={<Plus className="h-3.5 w-3.5" />}>Add item</Button>
                </div>
              </div>
              {itemsError && <p role="alert" className="mb-2 text-xs text-red-600">{itemsError}</p>}
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="hidden grid-cols-[1fr_110px_140px_130px_44px] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
                  <span>Product</span><span className="text-right">Qty</span><span className="text-right">Unit cost (₱)</span><span className="text-right">Amount</span><span />
                </div>
                <ul className="divide-y divide-line">
                  {fields.map((field, index) => {
                    const line = items?.[index];
                    const lineErrors = errors.items?.[index];
                    const product = products?.data.find((item) => item.id === line?.productId);
                    return (
                      <li key={field.id} className="grid gap-3 p-3 md:grid-cols-[1fr_110px_140px_130px_44px] md:items-start">
                        <div>
                          <label htmlFor={`items.${index}.productId`} className="sr-only">Product</label>
                          <Select
                            id={`items.${index}.productId`}
                            placeholder="Select a product"
                            options={productOptions}
                            aria-invalid={lineErrors?.productId ? true : undefined}
                            {...register(`items.${index}.productId`, { onChange: (event) => onProductChange(index, event.target.value) })}
                          />
                          {lineErrors?.productId && <p className="mt-1 text-xs text-red-600">{lineErrors.productId.message}</p>}
                          {product && <p className="mt-1 text-xs text-muted">On hand {product.totalStock} {product.unit} · reorder at {product.reorderLevel}</p>}
                        </div>
                        <div>
                          <label htmlFor={`items.${index}.quantity`} className="text-xs text-muted md:sr-only">Quantity</label>
                          <Input id={`items.${index}.quantity`} type="number" min={1} className="text-right" aria-invalid={lineErrors?.quantity ? true : undefined} {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                          {lineErrors?.quantity && <p className="mt-1 text-xs text-red-600">{lineErrors.quantity.message}</p>}
                        </div>
                        <div>
                          <label htmlFor={`items.${index}.unitCost`} className="text-xs text-muted md:sr-only">Unit cost</label>
                          <Input id={`items.${index}.unitCost`} type="number" step="0.01" min={0} className="text-right" aria-invalid={lineErrors?.unitCost ? true : undefined} {...register(`items.${index}.unitCost`, { valueAsNumber: true })} />
                          {lineErrors?.unitCost && <p className="mt-1 text-xs text-red-600">{lineErrors.unitCost.message}</p>}
                        </div>
                        <p className="pt-2 text-right text-sm font-semibold">{formatCurrency((Number(line?.quantity) || 0) * (Number(line?.unitCost) || 0))}</p>
                        <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove line ${index + 1}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-6 border-t border-line bg-slate-50 px-3 py-3 text-sm">
                  <span className="text-muted">{fields.length} item(s)</span>
                  <span>Total <span className="ml-2 text-base font-bold text-ink">{formatCurrency(total)}</span></span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button variant="secondary" onClick={submit("draft")} disabled={isSubmitting}>Save as draft</Button>
            <Button type="submit" loading={isSubmitting}>Submit for approval</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}

export function PurchaseOrderForm({ order }: { order?: PurchaseOrder }) {
  return (
    <Suspense>
      <PurchaseOrderFormInner order={order} />
    </Suspense>
  );
}
