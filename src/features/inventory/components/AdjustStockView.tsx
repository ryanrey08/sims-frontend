"use client";

import { SlidersHorizontal as SlidersHorizontalIcon } from "lucide-react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";
import { useCreateAdjustmentMutation } from "@/services/api/endpoints/inventoryApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectWarehouseId } from "@/store/features/appContextSlice";
import { adjustmentSchema, type AdjustmentValues } from "../schemas/stockSchemas";
import { AvailabilityHint } from "./AvailabilityHint";

const REASONS = ["Physical count correction", "Damaged / expired", "Found stock", "Returned by department", "Sample / internal use"];

function AdjustStock() {
  const router = useRouter();
  const toast = useToast();
  const contextWarehouse = useAppSelector(selectWarehouseId);
  const presetProduct = useSearchParams().get("productId") ?? "";
  const [createAdjustment, { error: mutationError }] = useCreateAdjustmentMutation();
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name" });
  const { data: warehouses } = useGetWarehousesQuery({ status: "active", pageSize: 100 });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { productId: presetProduct, warehouseId: contextWarehouse, direction: "in", quantity: 1, reason: "" },
  });
  const [productId, warehouseId, direction] = useWatch({ control, name: ["productId", "warehouseId", "direction"] });
  const product = products?.data.find((item) => item.id === productId);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const movement = await createAdjustment(values).unwrap();
      toast.success("Stock adjusted", `${movement.productName}: new balance ${movement.balanceAfter} ${movement.unit} (${movement.reference})`);
      // Reset quantity and reason for the next adjustment, keep the selections.
      reset({ ...values, quantity: 1, reason: "" });
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not adjust stock", error);
    }
  });

  const err = (name: keyof AdjustmentValues) => errors[name]?.message;

  return (
    <>
      <PageHeader icon={SlidersHorizontalIcon} title="Adjust stock" description="Correct quantities after a physical count, damage or other non-transaction changes." />
      <Card className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-5">
            <FormErrorBanner error={nonFieldError(mutationError)} />
            <RequiredNote />
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Adjustment type <span className="text-red-600">*</span></legend>
              <div className="grid grid-cols-2 gap-3">
                {(["in", "out"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-lg border p-3 text-sm transition-colors",
                      direction === value ? (value === "in" ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50") : "border-line hover:bg-slate-50",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <input type="radio" value={value} {...register("direction")} className="accent-brand-900" />
                      {value === "in" ? "Increase stock (+)" : "Decrease stock (−)"}
                    </span>
                    <span className="ml-6 text-xs text-muted">{value === "in" ? "Add units found or returned." : "Remove damaged, lost or used units."}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Product" htmlFor="productId" required error={err("productId")} className="sm:col-span-2">
                <Select placeholder="Select a product" options={(products?.data ?? []).map((item) => ({ label: `${item.sku} — ${item.name}`, value: item.id }))} {...fieldA11y("productId", err("productId"))} {...register("productId")} />
              </FormField>
              <FormField label="Warehouse" htmlFor="warehouseId" required error={err("warehouseId")}>
                <Select placeholder="Select a warehouse" options={(warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...fieldA11y("warehouseId", err("warehouseId"))} {...register("warehouseId")} />
              </FormField>
              <FormField label={`Quantity${product ? ` (${product.unit})` : ""}`} htmlFor="quantity" required error={err("quantity")}>
                <Input type="number" min={1} {...fieldA11y("quantity", err("quantity"))} {...register("quantity", { valueAsNumber: true })} />
              </FormField>
              <div className="sm:col-span-2">
                <AvailabilityHint productId={productId} warehouseId={warehouseId} unit={product?.unit} />
              </div>
              <FormField label="Reason" htmlFor="reason" required error={err("reason")} className="sm:col-span-2">
                <Textarea rows={2} placeholder="Explain why the quantity changed" {...fieldA11y("reason", err("reason"))} {...register("reason")} />
                <div className="flex flex-wrap gap-1.5">
                  {REASONS.map((reason) => (
                    <button key={reason} type="button" onClick={() => setValue("reason", reason, { shouldValidate: true })} className="rounded-full border border-line px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
                      {reason}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/inventory/movements")} disabled={isSubmitting}>View movements</Button>
            <Button type="submit" loading={isSubmitting}>Post adjustment</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}

export function AdjustStockView() {
  return (
    <Suspense>
      <AdjustStock />
    </Suspense>
  );
}
