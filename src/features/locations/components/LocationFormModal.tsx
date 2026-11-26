"use client";

import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, MapPin, Save, Settings, SlidersHorizontal } from "lucide-react";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormBlock, HField } from "@/components/forms/HField";
import { fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { requiredString, optionalString } from "@/schemas/common";
import { useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import type { MasterRecord } from "@/types/records";

export const LOCATION_TYPES = ["Area", "Rack", "Bin", "Shelf", "Cold Storage"];
export const ZONE_OPTIONS: SelectOption[] = [
  { label: "RCV – Receiving", value: "RCV" },
  { label: "Zone A", value: "A" },
  { label: "Zone B", value: "B" },
  { label: "Zone C", value: "C" },
  { label: "Zone D", value: "D" },
];
const UOM_OPTIONS: SelectOption[] = ["pcs", "box", "pallet", "kg", "liter"].map((value) => ({ label: value, value }));

const schema = z.object({
  code: requiredString("Location code", 30),
  name: requiredString("Location name", 80),
  warehouseId: requiredString("Warehouse"),
  type: requiredString("Type"),
  active: z.boolean(),
  zone: optionalString(20),
  rack: optionalString(20),
  bin: optionalString(20),
  capacity: z.string().trim().regex(/^\d*$/, "Enter a whole number."),
  uom: z.string(),
  description: optionalString(300),
  allowReceiving: z.boolean(),
  allowIssuance: z.boolean(),
  allowTransfer: z.boolean(),
  allowPhysicalInventory: z.boolean(),
  defaultReceiving: z.boolean(),
  defaultIssuance: z.boolean(),
});
type Values = z.infer<typeof schema>;

const ATTRIBUTES: { name: keyof Values; label: string; hint: string }[] = [
  { name: "allowReceiving", label: "Allow Receiving (Put-away)", hint: "Received stock can be put away to this location." },
  { name: "allowIssuance", label: "Allow Issuance (Picking)", hint: "Stock can be picked from this location for issuance." },
  { name: "allowTransfer", label: "Allow Stock Transfer", hint: "Stock can be moved into and out of this location." },
  { name: "allowPhysicalInventory", label: "Allow Physical Inventory", hint: "Included in stock counts." },
  { name: "defaultReceiving", label: "Default Receiving Location", hint: "Pre-selected when receiving into this warehouse." },
  { name: "defaultIssuance", label: "Default Issuance Location", hint: "Pre-selected when issuing from this warehouse." },
];

function toValues(record?: MasterRecord, warehouseId = ""): Values {
  const flag = (name: string, fallback: boolean) => (record?.[name] === undefined ? fallback : Boolean(record[name]));
  return {
    code: String(record?.code ?? ""),
    name: String(record?.name ?? ""),
    warehouseId: String(record?.warehouseId ?? warehouseId),
    type: String(record?.type ?? ""),
    active: (record?.status ?? "active") === "active",
    zone: String(record?.zone ?? ""),
    rack: String(record?.rack ?? ""),
    bin: String(record?.bin ?? ""),
    capacity: record?.capacity === undefined || record?.capacity === null ? "" : String(record.capacity),
    uom: String(record?.uom ?? "pcs"),
    description: String(record?.description ?? ""),
    allowReceiving: flag("allowReceiving", true),
    allowIssuance: flag("allowIssuance", true),
    allowTransfer: flag("allowTransfer", true),
    allowPhysicalInventory: flag("allowPhysicalInventory", true),
    defaultReceiving: flag("defaultReceiving", false),
    defaultIssuance: flag("defaultIssuance", false),
  };
}

/** "Add Location" / "Edit Location" red-header modal (mockup p7). */
export function LocationFormModal({
  open,
  record,
  warehouseOptions,
  defaultWarehouseId,
  onClose,
  onSaved,
}: {
  open: boolean;
  record?: MasterRecord;
  warehouseOptions: SelectOption[];
  defaultWarehouseId?: string;
  onClose: () => void;
  onSaved: (record: MasterRecord, created: boolean) => void;
}) {
  const formId = useId();
  const toast = useToast();
  const [save, saveState] = useSaveMasterRecordMutation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(record, defaultWarehouseId) });

  useEffect(() => {
    if (open) reset(toValues(record, defaultWarehouseId));
  }, [open, record, defaultWarehouseId, reset]);

  const active = watch("active");
  const onSubmit = handleSubmit(async ({ active: isActive, capacity, ...values }) => {
    try {
      const saved = await save({
        resource: "locations",
        id: record?.id,
        body: { ...values, code: values.code.toUpperCase(), capacity: capacity === "" ? null : Number(capacity), status: isActive ? "active" : "inactive" },
      }).unwrap();
      onSaved(saved, !record);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save location", error);
    }
  });

  const err = (name: keyof Values) => errors[name]?.message;
  const field = (name: keyof Values) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      variant="brand"
      icon={<MapPin className="h-5 w-5" />}
      title={record ? "Edit Location" : "Add Location"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form={formId} loading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save Location</Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        <FormErrorBanner error={nonFieldError(saveState.error)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <FormBlock title="Location Information" icon={MapPin}>
            <div className="space-y-3">
              <HField label="Location Code" htmlFor="code" required error={err("code")}>
                <Input className="uppercase placeholder:normal-case" placeholder="e.g. LOC-019" {...field("code")} />
              </HField>
              <HField label="Location Name" htmlFor="name" required error={err("name")}>
                <Input placeholder="e.g. Rack A-03" {...field("name")} />
              </HField>
              <HField label="Warehouse" htmlFor="warehouseId" required error={err("warehouseId")}>
                <Select options={warehouseOptions} placeholder="Select warehouse" {...field("warehouseId")} />
              </HField>
              <HField label="Type" htmlFor="type" required error={err("type")}>
                <Select options={LOCATION_TYPES.map((value) => ({ label: value, value }))} placeholder="Select type" {...field("type")} />
              </HField>
              <HField label="Status" htmlFor="active">
                <div className="pt-1.5">
                  <Switch id="active" label={active ? "Active" : "Inactive"} {...register("active")} />
                </div>
              </HField>
            </div>
          </FormBlock>
          <FormBlock title="Location Details" icon={SlidersHorizontal}>
            <div className="space-y-3">
              <HField label="Zone" htmlFor="zone" error={err("zone")}>
                <Select options={ZONE_OPTIONS} placeholder="Select zone" {...field("zone")} />
              </HField>
              <HField label="Rack" htmlFor="rack" error={err("rack")}>
                <Input placeholder="e.g. A-01" {...field("rack")} />
              </HField>
              <HField label="Bin" htmlFor="bin" error={err("bin")}>
                <Input placeholder="e.g. B1" {...field("bin")} />
              </HField>
              <HField label="Capacity" htmlFor="capacity" error={err("capacity")}>
                <div className="flex gap-2">
                  <Input inputMode="numeric" placeholder="0" className="min-w-0 flex-1" {...field("capacity")} />
                  <div className="w-24">
                    <Select options={UOM_OPTIONS} aria-label="Unit of measure" {...register("uom")} />
                  </div>
                </div>
              </HField>
              <HField label="Location Description" htmlFor="description" error={err("description")}>
                <Textarea rows={2} placeholder="Enter description (optional)" {...field("description")} />
              </HField>
            </div>
          </FormBlock>
        </div>
        <FormBlock title="Location Attributes" icon={Settings} tone="gray">
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
            {ATTRIBUTES.map((attribute) => (
              <div key={attribute.name} className="flex items-center gap-1.5">
                <Checkbox id={attribute.name} label={<span className="text-[13px]">{attribute.label}</span>} {...register(attribute.name)} />
                <span title={attribute.hint} className="text-slate-400">
                  <Info className="h-3.5 w-3.5" aria-label={attribute.hint} />
                </span>
              </div>
            ))}
          </div>
        </FormBlock>
      </form>
    </Modal>
  );
}
