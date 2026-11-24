"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ACTIVE_STATUS_OPTIONS, WAREHOUSE_TYPE_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { useCreateWarehouseMutation, useUpdateWarehouseMutation } from "@/services/api/endpoints/warehousesApi";
import type { Warehouse } from "@/types/models";
import { warehouseSchema, type WarehouseFormValues } from "../schemas/warehouseSchema";

const EMPTY: WarehouseFormValues = { code: "", name: "", type: "branch", address: "", manager: "", phone: "", status: "active" };

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(warehouse);
  const [createWarehouse, createState] = useCreateWarehouseMutation();
  const [updateWarehouse, updateState] = useUpdateWarehouseMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseSchema), defaultValues: warehouse ? { ...EMPTY, ...warehouse } : EMPTY });

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, phone: values.phone ?? "" };
    try {
      const saved = warehouse ? await updateWarehouse({ id: warehouse.id, body }).unwrap() : await createWarehouse(body).unwrap();
      toast.success(isEdit ? "Warehouse updated" : "Warehouse added", saved.name);
      router.push(`/warehouses/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save warehouse", error);
    }
  });

  const err = (name: keyof WarehouseFormValues) => errors[name]?.message;
  const field = (name: keyof WarehouseFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${warehouse?.name}` : "Add warehouse"} description="A location where stock is stored and tracked." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Warehouse details">
                <FormField label="Code" htmlFor="code" required error={err("code")} hint="e.g. WH-EAST">
                  <Input className="uppercase" {...fieldA11y("code", err("code"))} {...register("code", { setValueAs: (value: string) => value.toUpperCase() })} />
                </FormField>
                <FormField label="Type" htmlFor="type" required error={err("type")}>
                  <Select options={WAREHOUSE_TYPE_OPTIONS} {...field("type")} />
                </FormField>
                <FormField label="Name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
                  <Input {...field("name")} />
                </FormField>
                <FormField label="Address" htmlFor="address" required error={err("address")} className="sm:col-span-2">
                  <Textarea rows={2} {...field("address")} />
                </FormField>
                <FormField label="Manager" htmlFor="manager" required error={err("manager")}>
                  <Input {...field("manager")} />
                </FormField>
                <FormField label="Phone" htmlFor="phone" error={err("phone")}>
                  <Input type="tel" {...field("phone")} />
                </FormField>
                <FormField label="Status" htmlFor="status" required error={err("status")}>
                  <Select options={ACTIVE_STATUS_OPTIONS} {...field("status")} />
                </FormField>
              </FormSection>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>{isEdit ? "Save changes" : "Add warehouse"}</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
