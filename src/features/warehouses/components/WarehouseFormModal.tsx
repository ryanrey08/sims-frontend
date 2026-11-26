"use client";

import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Info, MapPin, Save, Settings, Warehouse as WarehouseIcon } from "lucide-react";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormBlock, HField } from "@/components/forms/HField";
import { fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { WAREHOUSE_TYPE_OPTIONS } from "@/constants/options";
import { REGION_OPTIONS, barangayOptions, cityOptions } from "@/constants/locations";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, isApiError, nonFieldError } from "@/lib/utils/errors";
import { useCreateWarehouseMutation, useUpdateWarehouseMutation } from "@/services/api/endpoints/warehousesApi";
import type { Warehouse } from "@/types/models";
import { warehouseSchema, type WarehouseFormValues } from "../schemas/warehouseSchema";

const EMPTY: WarehouseFormValues = {
  code: "",
  name: "",
  type: "central",
  active: true,
  address: "",
  region: "",
  city: "",
  barangay: "",
  postalCode: "",
  manager: "",
  phone: "",
  allowTransactions: true,
  allowTransfer: true,
  allowPhysicalInventory: true,
  defaultReceiving: false,
  defaultIssuance: false,
  remarks: "",
};

function toValues(warehouse?: Warehouse): WarehouseFormValues {
  if (!warehouse) return EMPTY;
  return {
    ...EMPTY,
    code: warehouse.code,
    name: warehouse.name,
    type: warehouse.type,
    active: warehouse.status === "active",
    address: warehouse.address,
    region: warehouse.region ?? "",
    city: warehouse.city ?? "",
    barangay: warehouse.barangay ?? "",
    postalCode: warehouse.postalCode ?? "",
    manager: warehouse.manager ?? "",
    phone: warehouse.phone ?? "",
    allowTransactions: warehouse.allowTransactions ?? true,
    allowTransfer: warehouse.allowTransfer ?? true,
    allowPhysicalInventory: warehouse.allowPhysicalInventory ?? true,
    defaultReceiving: Boolean(warehouse.defaultReceiving),
    defaultIssuance: Boolean(warehouse.defaultIssuance),
    remarks: warehouse.remarks ?? "",
  };
}

const VISIBLE = new Set(["code", "name", "type", "address", "region", "city", "barangay", "postalCode"]);

const SETTINGS: { name: keyof WarehouseFormValues; label: string; hint: string }[] = [
  { name: "allowTransactions", label: "Allow Stock Transactions", hint: "Receiving, issuance and adjustments can be posted to this warehouse." },
  { name: "allowTransfer", label: "Allow Stock Transfer (In/Out)", hint: "Stock can be transferred into and out of this warehouse." },
  { name: "allowPhysicalInventory", label: "Allow Physical Inventory", hint: "Stock counts can be scheduled for this warehouse." },
  { name: "defaultReceiving", label: "Default Warehouse for Receiving", hint: "Pre-selected on new receiving (GRN) documents." },
  { name: "defaultIssuance", label: "Default Issuance Warehouse", hint: "Pre-selected on new issuance (RIS/ICS/PAR) documents." },
];

/** "Add Warehouse" / "Edit Warehouse" red-header modal from mockup p4. */
export function WarehouseFormModal({
  open,
  warehouse,
  onClose,
  onSaved,
}: {
  open: boolean;
  warehouse?: Warehouse;
  onClose: () => void;
  onSaved: (warehouse: Warehouse, created: boolean) => void;
}) {
  const formId = useId();
  const toast = useToast();
  const isEdit = Boolean(warehouse);
  const [createWarehouse, createState] = useCreateWarehouseMutation();
  const [updateWarehouse, updateState] = useUpdateWarehouseMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseSchema), defaultValues: toValues(warehouse) });

  useEffect(() => {
    if (open) reset(toValues(warehouse));
  }, [open, warehouse, reset]);

  const region = watch("region");
  const city = watch("city");
  const active = watch("active");

  const onSubmit = handleSubmit(async ({ active: isActive, ...values }) => {
    const body = { ...values, status: isActive ? ("active" as const) : ("inactive" as const), manager: values.manager ?? "", phone: values.phone ?? "" };
    try {
      const saved = warehouse ? await updateWarehouse({ id: warehouse.id, body }).unwrap() : await createWarehouse(body).unwrap();
      onSaved(saved, !warehouse);
    } catch (error) {
      // Server errors on fields the modal does not show still surface as a toast.
      const shown = applyServerErrors(error, setError);
      const hidden = isApiError(error) && Object.keys(error.errors ?? {}).some((name) => !VISIBLE.has(name));
      if (!shown || hidden) toast.error("Could not save warehouse", error);
    }
  });

  const err = (name: keyof WarehouseFormValues) => errors[name]?.message;
  const field = (name: keyof WarehouseFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      variant="brand"
      icon={<WarehouseIcon className="h-5 w-5" />}
      title={isEdit ? "Edit Warehouse" : "Add Warehouse"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form={formId} loading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save Warehouse</Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <FormBlock title="Warehouse Information" icon={WarehouseIcon}>
            <div className="space-y-3">
              <HField label="Warehouse Code" htmlFor="code" required error={err("code")}>
                <Input className="uppercase placeholder:normal-case" placeholder="e.g. WH-NEW" {...fieldA11y("code", err("code"))} {...register("code", { setValueAs: (value: string) => value.toUpperCase() })} />
              </HField>
              <HField label="Warehouse Name" htmlFor="name" required error={err("name")}>
                <Input placeholder="Enter warehouse name" {...field("name")} />
              </HField>
              <HField label="Warehouse Type" htmlFor="type" required error={err("type")}>
                <Select options={WAREHOUSE_TYPE_OPTIONS} {...field("type")} />
              </HField>
              <HField label="Status" htmlFor="active">
                <div className="pt-1.5">
                  <Switch id="active" label={active ? "Active" : "Inactive"} {...register("active")} />
                </div>
              </HField>
            </div>
          </FormBlock>
          <FormBlock title="Location Details" icon={MapPin}>
            <div className="space-y-3">
              <HField label="Address" htmlFor="address" required error={err("address")}>
                <Textarea rows={2} placeholder="Street, building, landmark" {...field("address")} />
              </HField>
              <HField label="Region" htmlFor="region" required error={err("region")}>
                <Select
                  options={REGION_OPTIONS}
                  placeholder="Select region"
                  {...field("region")}
                  onChange={(event) => {
                    setValue("region", event.target.value, { shouldValidate: true, shouldDirty: true });
                    setValue("city", "");
                    setValue("barangay", "");
                  }}
                />
              </HField>
              <HField label="City / Municipality" htmlFor="city" required error={err("city")}>
                <Select
                  options={cityOptions(region)}
                  placeholder="Select city / municipality"
                  disabled={!region}
                  {...field("city")}
                  onChange={(event) => {
                    setValue("city", event.target.value, { shouldValidate: true, shouldDirty: true });
                    setValue("barangay", "");
                  }}
                />
              </HField>
              <HField label="Barangay" htmlFor="barangay" error={err("barangay")}>
                <Select options={barangayOptions(region, city)} placeholder="Select barangay" disabled={!city} {...field("barangay")} />
              </HField>
              <HField label="Postal Code" htmlFor="postalCode" error={err("postalCode")}>
                <Input inputMode="numeric" maxLength={4} placeholder="e.g. 1800" {...field("postalCode")} />
              </HField>
            </div>
          </FormBlock>
        </div>
        <FormBlock title="Warehouse Settings" icon={Settings} tone="gray">
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
            {SETTINGS.map((setting) => (
              <div key={setting.name} className="flex items-center gap-1.5">
                <Checkbox id={setting.name} label={<span className="text-[13px]">{setting.label}</span>} {...register(setting.name)} />
                <span title={setting.hint} className="text-slate-400">
                  <Info className="h-3.5 w-3.5" aria-label={setting.hint} />
                </span>
              </div>
            ))}
          </div>
        </FormBlock>
        <FormBlock title="Description / Remarks" icon={FileText}>
          <Textarea id="remarks" rows={3} aria-label="Description / Remarks" placeholder="Enter description or remarks (optional)" {...register("remarks")} />
        </FormBlock>
      </form>
    </Modal>
  );
}
