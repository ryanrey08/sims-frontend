"use client";

import { useRouter } from "next/navigation";
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
import { DEPARTMENT_OPTIONS, PRIORITY_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { todayISO } from "@/lib/utils/format";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useCreateRequisitionMutation } from "@/services/api/endpoints/requisitionsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import { requisitionSchema, type RequisitionFormValues } from "../schemas/requisitionSchema";

export function RequisitionForm() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppSelector(selectCurrentUser);
  const [createRequisition, { error: mutationError }] = useCreateRequisitionMutation();
  const { data: warehouses } = useGetWarehousesQuery({ status: "active", pageSize: 100 });

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      department: user?.department ?? "",
      warehouseId: "",
      neededBy: todayISO(),
      priority: "normal",
      purpose: "",
      remarks: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const warehouseId = useWatch({ control, name: "warehouseId" });
  const items = useWatch({ control, name: "items" });
  // Stock totals are scoped to the chosen warehouse so requesters see what is available.
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name", warehouseId: warehouseId || undefined });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await createRequisition({ ...values, remarks: values.remarks || undefined }).unwrap();
      toast.success("Requisition submitted", `${saved.reqNumber} is awaiting approval.`);
      router.push(`/requisitions/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not submit requisition", error);
    }
  });

  const err = (name: "department" | "warehouseId" | "neededBy" | "priority" | "purpose" | "remarks") => errors[name]?.message;
  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  return (
    <>
      <PageHeader title="New requisition" description="Request supplies for your department. The supply office reviews and issues them." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(mutationError)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Request details">
                <FormField label="Department" htmlFor="department" required error={err("department")}>
                  <Select placeholder="Select a department" options={DEPARTMENT_OPTIONS} {...fieldA11y("department", err("department"))} {...register("department")} />
                </FormField>
                <FormField label="Issue from" htmlFor="warehouseId" required error={err("warehouseId")}>
                  <Select placeholder="Select a warehouse" options={(warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...fieldA11y("warehouseId", err("warehouseId"))} {...register("warehouseId")} />
                </FormField>
                <FormField label="Needed by" htmlFor="neededBy" required error={err("neededBy")}>
                  <Input type="date" min={todayISO()} {...fieldA11y("neededBy", err("neededBy"))} {...register("neededBy")} />
                </FormField>
                <FormField label="Priority" htmlFor="priority" required error={err("priority")}>
                  <Select options={PRIORITY_OPTIONS} {...fieldA11y("priority", err("priority"))} {...register("priority")} />
                </FormField>
                <FormField label="Purpose" htmlFor="purpose" required error={err("purpose")} className="sm:col-span-2">
                  <Input placeholder="e.g. Monthly office supply replenishment" {...fieldA11y("purpose", err("purpose"))} {...register("purpose")} />
                </FormField>
                <FormField label="Remarks" htmlFor="remarks" error={err("remarks")} className="sm:col-span-2">
                  <Textarea rows={2} {...fieldA11y("remarks", err("remarks"))} {...register("remarks")} />
                </FormField>
              </FormSection>
            </div>
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Items requested <span className="text-red-600">*</span></h3>
                <Button variant="secondary" size="sm" onClick={() => append({ productId: "", quantity: 1 })} leftIcon={<Plus className="h-3.5 w-3.5" />}>Add item</Button>
              </div>
              {itemsError && <p role="alert" className="mb-2 text-xs text-red-600">{itemsError}</p>}
              <ul className="divide-y divide-line rounded-lg border border-line">
                {fields.map((field, index) => {
                  const product = products?.data.find((item) => item.id === items?.[index]?.productId);
                  const lineErrors = errors.items?.[index];
                  const short = product && warehouseId && (items?.[index]?.quantity ?? 0) > (product.totalStock ?? 0);
                  return (
                    <li key={field.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_120px_44px] sm:items-start">
                      <div>
                        <label htmlFor={`items.${index}.productId`} className="sr-only">Product</label>
                        <Select
                          id={`items.${index}.productId`}
                          placeholder="Select a product"
                          options={(products?.data ?? []).map((item) => ({ label: `${item.name} (${item.unit})`, value: item.id }))}
                          aria-invalid={lineErrors?.productId ? true : undefined}
                          {...register(`items.${index}.productId`)}
                        />
                        {lineErrors?.productId && <p className="mt-1 text-xs text-red-600">{lineErrors.productId.message}</p>}
                        {product && warehouseId && (
                          <p className={short ? "mt-1 text-xs text-amber-700" : "mt-1 text-xs text-muted"}>
                            Available: {product.totalStock} {product.unit}{short ? " — may be partially issued" : ""}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`items.${index}.quantity`} className="text-xs text-muted sm:sr-only">Quantity</label>
                        <Input id={`items.${index}.quantity`} type="number" min={1} className="text-right" aria-invalid={lineErrors?.quantity ? true : undefined} {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                        {lineErrors?.quantity && <p className="mt-1 text-xs text-red-600">{lineErrors.quantity.message}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove item ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Submit requisition</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
