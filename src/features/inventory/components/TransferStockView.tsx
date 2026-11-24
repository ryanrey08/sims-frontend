"use client";

import { Truck as TruckIcon } from "lucide-react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
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
import { useCreateTransferMutation } from "@/services/api/endpoints/inventoryApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectWarehouseId } from "@/store/features/appContextSlice";
import { transferSchema, type TransferValues } from "../schemas/stockSchemas";
import { AvailabilityHint } from "./AvailabilityHint";

function TransferStock() {
  const router = useRouter();
  const toast = useToast();
  const contextWarehouse = useAppSelector(selectWarehouseId);
  const presetProduct = useSearchParams().get("productId") ?? "";
  const [createTransfer, { error: mutationError }] = useCreateTransferMutation();
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name" });
  const { data: warehouses } = useGetWarehousesQuery({ status: "active", pageSize: 100 });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { productId: presetProduct, fromWarehouseId: contextWarehouse, toWarehouseId: "", quantity: 1, reason: "" },
  });
  const [productId, fromWarehouseId, toWarehouseId] = useWatch({ control, name: ["productId", "fromWarehouseId", "toWarehouseId"] });
  const product = products?.data.find((item) => item.id === productId);
  const warehouseOptions = (warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }));
  const err = (name: keyof TransferValues) => errors[name]?.message;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const movement = await createTransfer({ ...values, reason: values.reason ?? "" }).unwrap();
      toast.success("Transfer posted", `${values.quantity} ${movement.unit} of ${movement.productName} moved (${movement.reference}).`);
      reset({ ...values, quantity: 1, reason: "" });
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not transfer stock", error);
    }
  });

  return (
    <>
      <PageHeader icon={TruckIcon} title="Transfer stock" description="Move units between warehouses. Both sides are recorded as linked movements." />
      <Card className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-5">
            <FormErrorBanner error={nonFieldError(mutationError)} />
            <RequiredNote />
            <FormField label="Product" htmlFor="productId" required error={err("productId")}>
              <Select placeholder="Select a product" options={(products?.data ?? []).map((item) => ({ label: `${item.sku} — ${item.name}`, value: item.id }))} {...fieldA11y("productId", err("productId"))} {...register("productId")} />
            </FormField>
            <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <FormField label="From warehouse" htmlFor="fromWarehouseId" required error={err("fromWarehouseId")}>
                <Select placeholder="Source" options={warehouseOptions} {...fieldA11y("fromWarehouseId", err("fromWarehouseId"))} {...register("fromWarehouseId")} />
              </FormField>
              <ArrowRight className="mx-auto mt-9 hidden h-5 w-5 text-slate-400 sm:block" aria-hidden />
              <FormField label="To warehouse" htmlFor="toWarehouseId" required error={err("toWarehouseId")}>
                <Select placeholder="Destination" options={warehouseOptions} {...fieldA11y("toWarehouseId", err("toWarehouseId"))} {...register("toWarehouseId")} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AvailabilityHint productId={productId} warehouseId={fromWarehouseId} unit={product?.unit} />
              {toWarehouseId && toWarehouseId !== fromWarehouseId ? <AvailabilityHint productId={productId} warehouseId={toWarehouseId} unit={product?.unit} /> : <span />}
            </div>
            <FormField label={`Quantity${product ? ` (${product.unit})` : ""}`} htmlFor="quantity" required error={err("quantity")}>
              <Input type="number" min={1} className="sm:w-48" {...fieldA11y("quantity", err("quantity"))} {...register("quantity", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Notes" htmlFor="reason" error={err("reason")}>
              <Textarea rows={2} placeholder="Optional, e.g. replenish head office storeroom" {...fieldA11y("reason", err("reason"))} {...register("reason")} />
            </FormField>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/inventory")} disabled={isSubmitting}>Back to stock</Button>
            <Button type="submit" loading={isSubmitting}>Post transfer</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}

export function TransferStockView() {
  return (
    <Suspense>
      <TransferStock />
    </Suspense>
  );
}
