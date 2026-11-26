"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calculator, CalendarClock, FileText, ImageIcon, Info, Landmark, MapPin, Paperclip, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormBlock, HField } from "@/components/forms/HField";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { PROPERTY_CATEGORIES } from "@/config/masterData";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { formatCurrency } from "@/lib/utils/format";
import { useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import type { DocumentAttachment, FieldValue, MasterRecord } from "@/types/records";
import { Attachments } from "@/features/documents/components/Attachments";

const STATUS_OPTIONS = [
  { label: "In Service", value: "available" },
  { label: "In Use", value: "assigned" },
  { label: "For Maintenance", value: "for-maintenance" },
  { label: "For Disposal", value: "for-disposal" },
];
const opts = (values: string[]) => values.map((value) => ({ label: value, value }));
const money = z.string().refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Enter an amount of 0 or more.");

const schema = z.object({
  propertyNo: z.string().trim().min(1, "Property No. is required."),
  description: z.string().trim().min(1, "Description is required.").max(200),
  category: z.string().min(1, "Select a category."),
  propertyType: z.string().min(1, "Select a property type."),
  classificationId: z.string().min(1, "Select the account."),
  serialNo: z.string().trim().min(1, "Serial No. is required."),
  brand: z.string(),
  model: z.string(),
  assetTag: z.string(),
  uom: z.string(),
  acquisitionDate: z.string().min(1, "Acquisition date is required."),
  acquisitionCost: money.refine((value) => value !== "", "Acquisition cost is required."),
  supplierName: z.string(),
  poNo: z.string(),
  fundingSource: z.string(),
  warrantyUntil: z.string(),
  locationId: z.string().min(1, "Select a location."),
  department: z.string(),
  accountableId: z.string(),
  condition: z.string().min(1, "Select the condition."),
  depreciationMethod: z.string(),
  usefulLife: z.string().refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) > 0), "Enter whole years."),
  salvageValue: money,
  remarks: z.string(),
  status: z.string().min(1, "Select a status."),
});
type Values = z.infer<typeof schema>;
const NUMERIC: (keyof Values)[] = ["acquisitionCost", "usefulLife", "salvageValue"];

const TABS = [
  { key: "info", label: "Property Information", icon: Info },
  { key: "acquisition", label: "Acquisition Details", icon: Landmark },
  { key: "depreciation", label: "Depreciation Setup", icon: Calculator },
  { key: "location", label: "Location & Custodian", icon: MapPin },
  { key: "attachments", label: "Attachments", icon: Paperclip },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function toValues(record?: MasterRecord, nextNo = ""): Values {
  const get = (name: keyof Values, fallback = "") => (record?.[name] === null || record?.[name] === undefined ? fallback : String(record[name]));
  return {
    propertyNo: get("propertyNo", nextNo),
    description: get("description"),
    category: get("category"),
    propertyType: get("propertyType", "Equipment"),
    classificationId: get("classificationId"),
    serialNo: get("serialNo"),
    brand: get("brand"),
    model: get("model"),
    assetTag: get("assetTag"),
    uom: get("uom", "unit"),
    acquisitionDate: get("acquisitionDate"),
    acquisitionCost: get("acquisitionCost"),
    supplierName: get("supplierName"),
    poNo: get("poNo"),
    fundingSource: get("fundingSource", "GAA"),
    warrantyUntil: get("warrantyUntil"),
    locationId: get("locationId"),
    department: get("department"),
    accountableId: get("accountableId"),
    condition: get("condition", "Serviceable"),
    depreciationMethod: get("depreciationMethod", "Straight-Line"),
    usefulLife: get("usefulLife", "5"),
    salvageValue: get("salvageValue", "0"),
    remarks: get("remarks"),
    status: get("status", "available"),
  };
}

/** Straight-line schedule used by the Depreciation Setup tab (p65). */
export function depreciation(cost: number, salvage: number, life: number, start: string) {
  const depreciable = Math.max(0, cost - salvage);
  const annual = life > 0 ? depreciable / life : 0;
  const startYear = start ? new Date(start).getFullYear() : new Date().getFullYear();
  const elapsed = start ? Math.max(0, (Date.now() - new Date(start).getTime()) / (365.25 * 86400000)) : 0;
  const accumulated = Math.min(depreciable, annual * elapsed);
  const schedule = Array.from({ length: Math.min(life, 30) }, (_, index) => ({
    year: index + 1,
    period: `${startYear + index}`,
    annual,
    accumulated: annual * (index + 1),
    bookValue: cost - annual * (index + 1),
  }));
  return { depreciable, annual, monthly: annual / 12, accumulated, bookValue: cost - accumulated, schedule };
}

function PField({ name, label, required, error, children }: { name: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <HField label={label} htmlFor={name} required={required} error={error} labelWidth="w-36">
      {children}
    </HField>
  );
}

/** "New Property" red-header modal with tabs (mockup p52, p63–p66). */
export function PropertyFormModal({ open, record, onClose, onSaved }: { open: boolean; record?: MasterRecord; onClose: () => void; onSaved: (record: MasterRecord, created: boolean) => void }) {
  const formId = useId();
  const toast = useToast();
  const imageInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [image, setImage] = useState("");
  const [files, setFiles] = useState<DocumentAttachment[]>([]);
  const [save, saveState] = useSaveMasterRecordMutation();
  const { data: all } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } }, { skip: !open || Boolean(record) });
  const accounts = useReferenceOptions("property-classifications");
  const locations = useReferenceOptions("locations");
  const employees = useReferenceOptions("employees");
  const nextNo = useMemo(() => `PROP-${String(Math.max(0, ...(all?.data ?? []).map((item) => Number(String(item.propertyNo).replace(/\D/g, "")) || 0)) + 1).padStart(6, "0")}`, [all]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(record, nextNo) });
  const values = useWatch({ control });

  useEffect(() => {
    if (!open) return;
    reset(toValues(record, nextNo));
    setTab("info");
    setImage(String(record?.imageUrl ?? ""));
    try {
      setFiles(record?.attachments ? JSON.parse(String(record.attachments)) : []);
    } catch {
      setFiles([]);
    }
  }, [open, record, nextNo, reset]);

  const plan = depreciation(Number(values.acquisitionCost) || 0, Number(values.salvageValue) || 0, Number(values.usefulLife) || 0, values.acquisitionDate ?? "");

  const submit = (status?: string) =>
    handleSubmit(
      async (form) => {
        const body: Record<string, FieldValue> = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? null : NUMERIC.includes(key as keyof Values) ? Number(value) : value]));
        body.imageUrl = image || null;
        body.attachments = files.length ? JSON.stringify(files) : null;
        if (status) body.status = status;
        try {
          const saved = await save({ resource: "properties", id: record?.id, body }).unwrap();
          onSaved(saved, !record);
        } catch (error) {
          if (!applyServerErrors(error, setError)) toast.error("Could not save property", error);
        }
      },
      (invalid) => {
        // Jump to the tab holding the first invalid field.
        const first = Object.keys(invalid)[0] as keyof Values;
        const where: Record<string, TabKey> = { acquisitionDate: "acquisition", acquisitionCost: "acquisition", supplierName: "acquisition", poNo: "acquisition", usefulLife: "depreciation", salvageValue: "depreciation", locationId: "location", accountableId: "location", condition: "location", status: "location" };
        setTab(where[first] ?? "info");
      },
    );

  const field = (name: keyof Values) => ({ id: name, "aria-invalid": errors[name] ? true : undefined, ...register(name) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      variant="brand"
      icon={<Landmark className="h-5 w-5" />}
      title={record ? `Edit Property – ${String(record.propertyNo)}` : "New Property"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          {!record && <Button variant="outline" onClick={submit("available")} disabled={isSubmitting}>Save as Draft</Button>}
          <Button type="submit" form={formId} loading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Property sections">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)} className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold", tab === item.key ? "border-[#2f6fd6] bg-[#eaf2fe] text-[#2f6fd6]" : "border-line text-slate-700 hover:bg-slate-50")}>
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
      <form id={formId} onSubmit={submit()} noValidate className="space-y-4">
        <FormErrorBanner error={nonFieldError(saveState.error)} />
        <div className={cn("grid gap-4 lg:grid-cols-[2fr_1fr]", tab !== "info" && "hidden")}>
          <FormBlock title="Property Information" icon={Info}>
            <div className="grid gap-x-6 gap-y-3 xl:grid-cols-2">
              <PField error={errors.propertyNo?.message} name="propertyNo" label="Property No." required>
                <div className="flex gap-2">
                  <Input {...field("propertyNo")} />
                  {!record && <Button variant="outline" size="icon" aria-label="Generate the next property number" onClick={() => setValue("propertyNo", nextNo)}><RefreshCw className="h-4 w-4" /></Button>}
                </div>
              </PField>
              <PField error={errors.serialNo?.message} name="serialNo" label="Serial No." required><Input {...field("serialNo")} /></PField>
              <PField error={errors.description?.message} name="description" label="Description" required><Input {...field("description")} /></PField>
              <PField error={errors.model?.message} name="model" label="Model"><Input {...field("model")} /></PField>
              <PField error={errors.category?.message} name="category" label="Category" required><Select placeholder="Select category" options={opts(PROPERTY_CATEGORIES)} {...field("category")} /></PField>
              <PField error={errors.brand?.message} name="brand" label="Brand"><Input {...field("brand")} /></PField>
              <PField error={errors.propertyType?.message} name="propertyType" label="Property Type" required><Select options={opts(["Equipment", "Furniture", "Vehicle", "Building", "Other"])} {...field("propertyType")} /></PField>
              <PField error={errors.assetTag?.message} name="assetTag" label="Asset Tag / RFID"><Input {...field("assetTag")} /></PField>
              <PField error={errors.classificationId?.message} name="classificationId" label="Account" required><Select key={accounts.options.length} placeholder="Select account" options={accounts.options} {...field("classificationId")} /></PField>
              <PField error={errors.uom?.message} name="uom" label="UOM"><Select options={opts(["unit", "set", "lot", "pc"])} {...field("uom")} /></PField>
            </div>
          </FormBlock>
          <FormBlock title="Property Image" icon={ImageIcon}>
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image ? <img src={image} alt="Property" className="h-full w-full object-contain" /> : <ImageIcon className="h-10 w-10 text-slate-300" aria-hidden />}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => imageInput.current?.click()} leftIcon={<Upload className="h-3.5 w-3.5" />}>Upload</Button>
              <Button size="sm" variant="outline" className="text-red-600" disabled={!image} onClick={() => setImage("")} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Remove</Button>
            </div>
            <input
              ref={imageInput}
              type="file"
              accept="image/png,image/jpeg"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) return toast.error("Image too large", "Choose an image up to 5 MB.");
                const reader = new FileReader();
                reader.onload = () => {
                  const img = new Image();
                  img.onload = () => {
                    const scale = Math.min(1, 320 / Math.max(img.width, img.height));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setImage(canvas.toDataURL("image/jpeg", 0.8));
                  };
                  img.src = String(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
          </FormBlock>
        </div>

        <div className={cn("grid gap-4 lg:grid-cols-2", tab !== "acquisition" && "hidden")}>
          <FormBlock title="Acquisition Information" icon={Landmark}>
            <div className="space-y-3">
              <PField error={errors.acquisitionDate?.message} name="acquisitionDate" label="Acquisition Date" required><Input type="date" {...field("acquisitionDate")} /></PField>
              <PField error={errors.supplierName?.message} name="supplierName" label="Supplier"><Input {...field("supplierName")} /></PField>
              <PField error={errors.poNo?.message} name="poNo" label="PO / Reference No."><Input {...field("poNo")} /></PField>
              <PField error={errors.fundingSource?.message} name="fundingSource" label="Funding Source"><Select options={opts(["GAA", "Income", "Trust Fund", "Donation"])} {...field("fundingSource")} /></PField>
              <PField error={errors.warrantyUntil?.message} name="warrantyUntil" label="Warranty Until"><Input type="date" {...field("warrantyUntil")} /></PField>
            </div>
          </FormBlock>
          <FormBlock title="Cost Details" icon={Calculator}>
            <div className="space-y-3">
              <PField error={errors.acquisitionCost?.message} name="acquisitionCost" label="Acquisition Cost (₱)" required><Input type="number" step="0.01" min={0} {...field("acquisitionCost")} /></PField>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 text-[13px]"><span className="font-semibold">Total Capitalized Cost</span><b>{formatCurrency(Number(values.acquisitionCost) || 0)}</b></div>
              <PField error={errors.remarks?.message} name="remarks" label="Remarks"><Textarea rows={3} {...field("remarks")} /></PField>
            </div>
          </FormBlock>
        </div>

        <div className={cn("space-y-4", tab !== "depreciation" && "hidden")}>
          <div className="grid gap-4 lg:grid-cols-3">
            <FormBlock title="Depreciation Information" icon={Calculator}>
              <div className="space-y-3">
                <PField error={errors.depreciationMethod?.message} name="depreciationMethod" label="Method"><Select options={opts(["Straight-Line"])} {...field("depreciationMethod")} /></PField>
                <PField error={errors.usefulLife?.message} name="usefulLife" label="Useful Life (Years)"><Input type="number" min={1} {...field("usefulLife")} /></PField>
                <PField error={errors.salvageValue?.message} name="salvageValue" label="Salvage Value (₱)"><Input type="number" step="0.01" min={0} {...field("salvageValue")} /></PField>
              </div>
            </FormBlock>
            <FormBlock title="Depreciation Calculation" icon={Calculator}>
              <dl className="space-y-1.5 text-[13px]">
                {[
                  ["Acquisition Cost", formatCurrency(Number(values.acquisitionCost) || 0)],
                  ["Less: Salvage Value", formatCurrency(Number(values.salvageValue) || 0)],
                  ["Depreciable Amount", formatCurrency(plan.depreciable)],
                  ["Useful Life (Years)", values.usefulLife || "—"],
                  ["Depreciation per Year", formatCurrency(plan.annual)],
                  ["Depreciation per Month", formatCurrency(plan.monthly)],
                ].map(([label, value]) => <div key={label} className="flex justify-between"><dt className="text-slate-600">{label}</dt><dd className="font-bold">{value}</dd></div>)}
              </dl>
            </FormBlock>
            <FormBlock title="Depreciation Summary" icon={CalendarClock}>
              <dl className="space-y-1.5 text-[13px]">
                {[
                  ["Method", values.depreciationMethod || "Straight-Line"],
                  ["Annual Depreciation", formatCurrency(plan.annual)],
                  ["Accum. Deprec. (to date)", formatCurrency(plan.accumulated)],
                  ["Book Value (Current)", formatCurrency(plan.bookValue)],
                ].map(([label, value]) => <div key={label} className="flex justify-between"><dt className="text-slate-600">{label}</dt><dd className="font-bold">{value}</dd></div>)}
              </dl>
            </FormBlock>
          </div>
          <FormBlock title="Depreciation Schedule (Projected)" icon={FileText}>
            <div className="-mx-4 max-h-56 overflow-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="bg-[#f3f4f6] text-left text-xs font-bold"><th className="px-4 py-2">Year</th><th className="px-3 py-2">Period Covered</th><th className="px-3 py-2 text-right">Annual Depreciation</th><th className="px-3 py-2 text-right">Accumulated Depreciation</th><th className="px-4 py-2 text-right">Book Value (End of Year)</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {plan.schedule.map((row) => (
                    <tr key={row.year}><td className="px-4 py-2">{row.year}</td><td className="px-3 py-2">{row.period}</td><td className="px-3 py-2 text-right">{formatCurrency(row.annual)}</td><td className="px-3 py-2 text-right">{formatCurrency(row.accumulated)}</td><td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.bookValue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormBlock>
        </div>

        <div className={cn(tab !== "location" && "hidden")}>
          <FormBlock title="Location & Custodian" icon={MapPin}>
            <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
              <PField error={errors.locationId?.message} name="locationId" label="Location" required><Select key={locations.options.length} placeholder="Select location" options={locations.options} {...field("locationId")} /></PField>
              <PField error={errors.department?.message} name="department" label="Department / Unit"><Input {...field("department")} /></PField>
              <PField error={errors.accountableId?.message} name="accountableId" label="Custodian"><Select key={employees.options.length} placeholder="Not assigned" options={employees.options} {...field("accountableId")} /></PField>
              <PField error={errors.condition?.message} name="condition" label="Condition" required><Select options={opts(["Serviceable", "For Repair", "Unserviceable"])} {...field("condition")} /></PField>
              <PField error={errors.status?.message} name="status" label="Status" required><Select className="font-semibold text-[#1a7f46]" options={STATUS_OPTIONS} {...field("status")} /></PField>
            </div>
          </FormBlock>
        </div>

        <div className={cn(tab !== "attachments" && "hidden")}>
          <FormBlock title="Attachments" icon={Paperclip}>
            <Attachments value={files} onChange={setFiles} />
          </FormBlock>
        </div>
      </form>
    </Modal>
  );
}
