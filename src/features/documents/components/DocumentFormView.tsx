"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, FileText, Info, ListChecks, Mail, MapPin, Package, Paperclip, Phone, Plus, Save, Send, Trash2, Upload, UserRound, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Unauthorized } from "@/components/common/Unauthorized";
import { DynamicField, schemaForFields, toApiValues } from "@/components/forms/DynamicField";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormBlock, HField } from "@/components/forms/HField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { documentPrefix, getDocumentDef, type DocumentDef } from "@/config/documents";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { pickCsvFile } from "@/lib/utils/csv";
import { cn } from "@/lib/utils/cn";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/utils/format";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectCurrentUser } from "@/store/features/authSlice";
import { useGetDocumentQuery, useGetDocumentsQuery, useSaveDocumentMutation } from "@/services/api/endpoints/documentsApi";
import { useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { DocumentAttachment, TransactionDocument } from "@/types/records";
import { HorizontalWorkflow } from "./ApprovalWorkflow";
import { Attachments } from "./Attachments";
import { HeaderValue, SummaryRows, TotalAmount } from "./parts";

const itemSchema = z.object({
  refId: z.string().min(1, "Select an item."),
  quantity: z.string(),
  poQty: z.string(),
  receivedQty: z.string(),
  countedQty: z.string(),
  condition: z.string(),
  remarks: z.string(),
});

type ItemValues = z.infer<typeof itemSchema>;
type FormValues = { date: string; remarks: string; fields: Record<string, string>; items: ItemValues[] };

const isWhole = (value: string, min: number) => value !== "" && Number.isInteger(Number(value)) && Number(value) >= min;

function buildSchema(def: DocumentDef) {
  const receiving = def.ui.itemColumns.includes("receivedQty");
  const items = z
    .array(
      itemSchema.superRefine((item, ctx) => {
        if (def.itemMode === "stock" && !isWhole(item.quantity, receiving ? 0 : 1)) {
          ctx.addIssue({ code: "custom", path: ["quantity"], message: receiving ? "Enter the accepted quantity." : "Enter a quantity above 0." });
        }
        if (receiving && !isWhole(item.receivedQty, 1)) ctx.addIssue({ code: "custom", path: ["receivedQty"], message: "Enter the received quantity." });
        if (receiving && Number(item.quantity) > Number(item.receivedQty)) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Accepted cannot exceed received." });
        if (def.itemMode === "count" && !isWhole(item.countedQty, 0)) ctx.addIssue({ code: "custom", path: ["countedQty"], message: "Enter the counted quantity." });
      }),
    )
    .min(1, "Add at least one item.")
    .refine((rows) => new Set(rows.map((row) => row.refId)).size === rows.length, "Each item can appear only once.");
  return z.object({ date: z.string().min(1, "Date is required."), remarks: z.string(), fields: schemaForFields(def.fields), items });
}

const EMPTY_ITEM: ItemValues = { refId: "", quantity: "1", poQty: "", receivedQty: "", countedQty: "", condition: "", remarks: "" };
const tinted = { green: "bg-[#e8f7ee] text-[#1a7f46]", red: "bg-[#fdeeee] text-red-600", blue: "bg-[#eaf2fe] text-[#2f6fd6]", yellow: "bg-[#fdf5e3]" };

/**
 * Transaction form from the mockups (p10, p15, p26, p29, p31): status pill, number and date
 * in the header; information card with horizontal labels; item table; remarks / attachments,
 * summary with the pink total, or the horizontal approval stepper; and the action bar.
 */
function DocumentForm({ def, doc }: { def: DocumentDef; doc?: TransactionDocument }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const user = useAppSelector(selectCurrentUser);
  const searchParams = useSearchParams();
  const { ui } = def;
  const [save, { error: mutationError }] = useSaveDocumentMutation();
  const schema = useMemo(() => buildSchema(def), [def]);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>(doc?.attachments ?? []);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Stock counts use the 3-step wizard from the mockup: Setup, Enter Count, Review & Submit.
  const wizard = def.key === "physical-counts";
  const [step, setStep] = useState(0);
  const {
    register,
    control,
    handleSubmit,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: doc?.date ?? todayISO(),
      remarks: doc?.remarks ?? "",
      fields: Object.fromEntries(
        def.fields.map((field) => {
          const value = doc?.fields[field.name];
          // New documents can be prefilled from the link, e.g. ?adjustmentType=Stock In (Add).
          if (!doc && searchParams.get(field.name)) return [field.name, searchParams.get(field.name) as string];
          if (value === null || value === undefined) return [field.name, !doc && (field.name === "requestedBy" || field.name === "preparedBy") ? (user?.name ?? "") : ""];
          return [field.name, String(value)];
        }),
      ),
      items:
        doc?.items.map((item) => ({
          refId: item.refId,
          quantity: String(Math.abs(item.quantity)),
          poQty: item.poQty === undefined ? "" : String(item.poQty),
          receivedQty: item.receivedQty === undefined ? "" : String(item.receivedQty),
          countedQty: item.countedQty === undefined ? "" : String(item.countedQty),
          condition: item.condition ?? "",
          remarks: item.remarks ?? "",
        })) ?? [EMPTY_ITEM],
    },
  });
  const { fields: lines, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const fieldValues = useWatch({ control, name: "fields" });
  const date = useWatch({ control, name: "date" });
  const warehouseId = ui.warehouseField ? fieldValues?.[ui.warehouseField] : undefined;

  // Stock is scoped to the selected warehouse so preparers see what is available there.
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "sku", warehouseId: warehouseId || undefined }, { skip: def.itemMode === "property" });
  const { data: properties } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 200 } }, { skip: def.itemMode !== "property" });
  const { data: suppliers } = useGetSuppliersQuery({ pageSize: 100 }, { skip: !def.fields.some((field) => field.optionsFrom === "suppliers") });
  const { data: warehouseData } = useGetWarehousesQuery({ pageSize: 100 }, { skip: !wizard });
  const warehouseLabel = (id?: string) => {
    const warehouse = warehouseData?.data.find((item) => item.id === id);
    return warehouse ? `${warehouse.code} – ${warehouse.name}` : "—";
  };
  const { data: existing } = useGetDocumentsQuery({ type: def.key, params: { pageSize: 500 } }, { skip: Boolean(doc) });
  const productById = useMemo(() => new Map((products?.data ?? []).map((product) => [product.id, product])), [products]);
  const propertyById = useMemo(() => new Map((properties?.data ?? []).map((record) => [record.id, record])), [properties]);
  const itemOptions =
    def.itemMode === "property"
      ? (properties?.data ?? []).filter((record) => !["disposed", "lost"].includes(String(record.status))).map((record) => ({ label: String(record.propertyNo), value: record.id }))
      : (products?.data ?? []).map((product) => ({ label: product.sku, value: product.id }));

  const inbound = def.key !== "stock-adjustments" || String(fieldValues?.adjustmentType ?? "").startsWith("Stock In");
  const lineInfo = (item: ItemValues | undefined) => {
    const product = item ? productById.get(item.refId) : undefined;
    const property = item ? propertyById.get(item.refId) : undefined;
    const quantity = def.itemMode === "property" ? 1 : Number(item?.quantity) || 0;
    const unitCost = def.itemMode === "property" ? Number(property?.acquisitionCost ?? 0) : (product?.unitCost ?? 0);
    const available = product?.totalStock ?? 0;
    return {
      description: def.itemMode === "property" ? String(property?.description ?? "") : (product?.name ?? ""),
      unit: def.itemMode === "property" ? (property ? "unit" : "") : (product?.unit ?? ""),
      available,
      unitCost,
      quantity,
      amount: quantity * unitCost,
      rejected: Math.max(0, (Number(item?.receivedQty) || 0) - quantity),
      variance: (Number(item?.countedQty) || 0) - available,
      newStock: inbound ? available + quantity : available - quantity,
    };
  };
  const totals = (items ?? []).reduce(
    (sum, item) => {
      const info = lineInfo(item);
      return {
        quantity: sum.quantity + info.quantity,
        amount: sum.amount + info.amount,
        poQty: sum.poQty + (Number(item.poQty) || 0),
        received: sum.received + (Number(item.receivedQty) || 0),
        rejected: sum.rejected + info.rejected,
        variance: sum.variance + (item.countedQty === "" ? 0 : info.variance),
      };
    },
    { quantity: 0, amount: 0, poQty: 0, received: 0, rejected: 0, variance: 0 },
  );

  // Next number preview, e.g. ST-2026-00129 (the API assigns the final number).
  const prefix = documentPrefix(def, fieldValues ?? {});
  const nextNumber = useMemo(() => {
    const numbers = (existing?.data ?? []).filter((item) => item.number.startsWith(`${prefix}-`)).map((item) => Number(item.number.split("-").pop()) || 0);
    return `${prefix}-${new Date().getFullYear()}-${String(Math.max(100, ...numbers) + 1).padStart(5, "0")}`;
  }, [existing, prefix]);
  const number = doc?.number ?? nextNumber;

  const submit = (mode: "draft" | "submit" | "post") =>
    handleSubmit(async (values) => {
      const body = {
        date: values.date,
        remarks: values.remarks || undefined,
        attachments,
        submit: mode !== "draft",
        fields: toApiValues(def.fields, values.fields),
        items: values.items.map((item) => ({
          refId: item.refId,
          quantity: def.itemMode === "property" ? 1 : Number(item.quantity || 0),
          poQty: item.poQty === "" ? undefined : Number(item.poQty),
          receivedQty: item.receivedQty === "" ? undefined : Number(item.receivedQty),
          countedQty: def.itemMode === "count" ? Number(item.countedQty) : undefined,
          condition: item.condition || undefined,
          remarks: item.remarks || undefined,
        })),
      };
      try {
        const saved = await save({ type: def.key, id: doc?.id, body }).unwrap();
        if (mode === "post") {
          // Opens the "Approve and Post" confirmation on the saved document.
          router.push(`/documents/${def.key}/${saved.id}?approve=1`);
          return;
        }
        toast.success(mode === "submit" ? "Submitted for approval" : "Draft saved", `${saved.number} was saved.`);
        router.push(`/documents/${def.key}/${saved.id}`);
      } catch (error) {
        // Field errors from the API map onto the header fields; values are kept.
        if (error && typeof error === "object" && "errors" in error && error.errors) {
          const mapped = Object.fromEntries(Object.entries(error.errors as Record<string, string[]>).map(([key, value]) => [key.startsWith("items.") || key === "items" || key === "date" ? key : `fields.${key}`, value]));
          applyServerErrors({ ...(error as object), errors: mapped }, setError);
        } else {
          toast.error(`Could not save ${def.singular}`, error);
        }
      }
    });

  const importItems = async () => {
    try {
      const rows = await pickCsvFile();
      if (!rows.length) return;
      const bySku = new Map((products?.data ?? []).map((product) => [product.sku.toLowerCase(), product]));
      let added = 0;
      rows.forEach((row) => {
        const product = bySku.get(String(row.itemcode ?? row.code ?? row.sku ?? "").toLowerCase());
        if (!product || (items ?? []).some((item) => item.refId === product.id)) return;
        append({ ...EMPTY_ITEM, refId: product.id, quantity: String(row.quantity ?? row.qty ?? 1), receivedQty: String(row.received ?? row.quantity ?? ""), countedQty: String(row.counted ?? "") });
        added += 1;
      });
      toast.success("Items imported", `${added} of ${rows.length} rows added.`);
    } catch (error) {
      toast.error("Could not read the file", error);
    }
  };

  const removeSelected = () => {
    const indexes = [...selected].sort((a, b) => b - a);
    if (indexes.length >= lines.length) {
      toast.error("Keep at least one item", "A document needs at least one line.");
      return;
    }
    remove(indexes);
    setSelected(new Set());
  };

  const mainFields = def.fields.filter((field) => field.group !== "side");
  const sideFields = def.fields.filter((field) => field.group === "side");
  const supplier = suppliers?.data.find((item) => item.id === fieldValues?.supplierId);
  const itemsError = errors.items?.message ?? errors.items?.root?.message;
  const cols = ui.itemColumns;
  const showQty = def.itemMode !== "property";
  const approver = can(def.approvePermission);
  const attachmentsLeft = ui.showAmount || def.key === "stock-adjustments";
  const counted = (items ?? []).filter((item) => item.countedQty !== "").length;
  const withVariance = (items ?? []).filter((item) => item.countedQty !== "" && lineInfo(item).variance !== 0).length;
  const systemTotal = (items ?? []).reduce((sum, item) => sum + (item.refId ? lineInfo(item).available : 0), 0);
  const actualTotal = (items ?? []).reduce((sum, item) => sum + (Number(item.countedQty) || 0), 0);
  const goTo = async (next: number) => {
    if (next > step) {
      const valid = step === 0 ? await trigger(["date", "fields", ...lines.map((_, index) => `items.${index}.refId` as const)]) : await trigger("items");
      if (!valid) return;
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const summaryStrip = [
    { label: ui.numberLabel, value: number },
    { label: "Warehouse", value: warehouseLabel(fieldValues?.warehouseId) },
    { label: "Count Type", value: <Badge tone="info">{fieldValues?.countType || "—"}</Badge> },
    { label: "Count Date", value: formatDate(date) },
    { label: "Description", value: fieldValues?.description || "—" },
  ];

  return (
    <>
      <PageHeader
        icon={FileText}
        title={doc ? <>Edit {ui.title} <span className="font-normal">– {doc.number}</span></> : ui.titleNote ? <>{ui.title} <span className="font-normal">{ui.titleNote}</span></> : ui.newLabel}
        description={ui.subtitle}
        aside={
          wizard ? (
            <WizardSteps steps={["Setup", "Enter Count", "Review & Submit"]} current={step} />
          ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={doc?.status === "rejected" ? "danger" : "success"}>{doc?.status === "rejected" ? "Returned" : "Draft"}</Badge>
            <HeaderValue label={ui.numberLabel} value={number} tone="red" />
            <HeaderValue label="Date" value={formatDate(date)} />
          </div>
          )
        }
      />
      <form
        onSubmit={
          wizard && step < 2
            ? (event) => {
                event.preventDefault();
                void goTo(step + 1);
              }
            : submit("submit")
        }
        noValidate
        className="space-y-4"
      >
        <FormErrorBanner error={nonFieldError(mutationError)} />
        {wizard && step > 0 && (
          <div className="grid gap-4 rounded-lg border border-line bg-white px-4 py-3 text-[13px] sm:grid-cols-3 lg:grid-cols-5">
            {summaryStrip.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <div className="font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        )}
        {(!wizard || step === 0) && (
        <div className={cn("grid gap-4", (ui.sideTitle || sideFields.length > 0) && "xl:grid-cols-[2fr_1fr]")}>
          <FormBlock title={ui.infoTitle} icon={FileText}>
            <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
              <HField label={ui.numberLabel} htmlFor="doc-number" required labelWidth="w-40">
                <Input id="doc-number" value={number} readOnly className="bg-slate-100 font-semibold text-slate-700" />
              </HField>
              <HField label={def.key === "stock-transfers" ? "Transfer Date" : "Date"} htmlFor="date" required error={errors.date?.message} labelWidth="w-40">
                <Input id="date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              </HField>
              {mainFields.map((field) => (
                <DynamicField
                  key={field.name}
                  layout="horizontal"
                  field={field}
                  registration={register(`fields.${field.name}`)}
                  error={errors.fields?.[field.name]?.message}
                  className={cn("[&>label]:sm:w-40", field.wide && "md:col-span-2")}
                />
              ))}
            </div>
          </FormBlock>
          {(ui.sideTitle || sideFields.length > 0) && (
            <FormBlock title={ui.sideTitle ?? "Additional Information"} icon={sideFields.length ? UserRound : Building2}>
              {sideFields.length > 0 ? (
                <div className="space-y-3">
                  {sideFields.map((field) => (
                    <DynamicField key={field.name} layout="horizontal" field={field} registration={register(`fields.${field.name}`)} error={errors.fields?.[field.name]?.message} className="[&>label]:sm:w-32" />
                  ))}
                </div>
              ) : supplier ? (
                <div className="space-y-2 text-[13px]">
                  <p className="text-sm font-bold">{supplier.name}</p>
                  {supplier.tin && <p className="text-slate-600">TIN: {supplier.tin}</p>}
                  <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{supplier.contactPerson}</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{supplier.phone}</p>
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{supplier.email}</p>
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{supplier.address}</p>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-[13px] text-slate-500"><Info className="h-4 w-4" />Select a supplier to see its details.</p>
              )}
            </FormBlock>
          )}
        </div>
        )}

        {(!wizard || step <= 1) && (
        <FormBlock
          title={wizard && step === 1 ? "Enter Item Count" : ui.itemsTitle}
          icon={Package}
          actions={
            <>
              <Button size="sm" variant="outline" className="border-brand-600 text-brand-600" onClick={() => append(EMPTY_ITEM)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {def.key === "stock-transfers" ? "Add Items" : "Add Item"}
              </Button>
              {def.itemMode !== "property" && (
                <Button size="sm" variant="outline" onClick={importItems} leftIcon={<Upload className="h-3.5 w-3.5" />}>Import (Excel)</Button>
              )}
              <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={removeSelected} disabled={!selected.size} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                Remove Selected
              </Button>
            </>
          }
        >
          {wizard && step === 1 && (
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-[13px] text-slate-600">Enter the actual physical count for each item. You can manually input, scan barcode, or import from a file.</p>
              <div className="flex gap-2 text-[13px]">
                <span className="rounded-md border border-[#cfe0fb] bg-[#eaf2fe] px-3 py-1.5">Total Items <b className="ml-1">{lines.length}</b></span>
                <span className="rounded-md border border-[#cdeedb] bg-[#e8f7ee] px-3 py-1.5">Counted <b className="ml-1">{counted}</b></span>
                <span className="rounded-md border border-[#f8e3b5] bg-[#fdf5e3] px-3 py-1.5">Remaining <b className="ml-1">{lines.length - counted}</b></span>
              </div>
            </div>
          )}
          {itemsError && <p role="alert" className="mb-2 text-xs text-red-600">{itemsError}</p>}
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="bg-[#f3f4f6] text-left text-xs font-bold text-ink">
                  <th className="w-10 px-3 py-2.5"><span className="sr-only">Select</span></th>
                  <th className="w-8 px-2 py-2.5">#</th>
                  <th className="w-40 px-2 py-2.5">{def.itemMode === "property" ? "Property No." : "Item Code"} <span className="text-red-600">*</span></th>
                  <th className="px-2 py-2.5">{def.itemMode === "property" ? "Description" : "Item Description"}</th>
                  <th className="px-2 py-2.5">UoM</th>
                  {def.itemMode === "count" && <th className="px-2 py-2.5 text-right">System Qty</th>}
                  {cols.includes("available") && <th className="px-2 py-2.5 text-right">{def.key === "stock-transfers" ? "Available (From WH)" : "Available Qty"}</th>}
                  {cols.includes("currentStock") && <th className="px-2 py-2.5 text-right">Current Stock</th>}
                  {cols.includes("poQty") && <th className="w-24 px-2 py-2.5 text-right">PO Qty</th>}
                  {cols.includes("receivedQty") && <th className="w-24 px-2 py-2.5 text-right">Received Qty <span className="text-red-600">*</span></th>}
                  {showQty && <th className="w-28 px-2 py-2.5 text-right">{ui.quantityLabel} <span className="text-red-600">*</span></th>}
                  {cols.includes("rejectedQty") && <th className="px-2 py-2.5 text-right">Rejected Qty</th>}
                  {def.itemMode === "count" && <th className="px-2 py-2.5 text-right">Variance</th>}
                  {cols.includes("newStock") && <th className="px-2 py-2.5 text-right">New Stock</th>}
                  {cols.includes("condition") && <th className="w-36 px-2 py-2.5">Condition</th>}
                  {cols.includes("unitCost") && <th className="px-2 py-2.5 text-right">{def.itemMode === "property" ? "Acquisition Cost" : "Unit Cost (₱)"}</th>}
                  {cols.includes("amount") && <th className="px-2 py-2.5 text-right">Amount</th>}
                  {cols.includes("remarks") && <th className="w-40 px-2 py-2.5">Remarks</th>}
                  <th className="w-12 px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line, index) => {
                  const item = items?.[index];
                  const info = lineInfo(item);
                  const lineErrors = errors.items?.[index];
                  return (
                    <tr key={line.id} className="align-top">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select line ${index + 1}`}
                          className="mt-2.5 h-4 w-4 accent-brand-600"
                          checked={selected.has(index)}
                          onChange={(event) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(index);
                              else next.delete(index);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-2 pt-4 text-slate-500">{index + 1}</td>
                      <td className="px-2 py-2">
                        <label htmlFor={`items.${index}.refId`} className="sr-only">Item code, line {index + 1}</label>
                        <Select id={`items.${index}.refId`} placeholder="Select" options={itemOptions} aria-invalid={lineErrors?.refId ? true : undefined} className="font-semibold text-[#2f6fd6]" {...register(`items.${index}.refId`)} />
                        {lineErrors?.refId && <p className="mt-1 text-xs text-red-600">{lineErrors.refId.message}</p>}
                      </td>
                      <td className="px-2 py-2 pt-4">{info.description || <span className="text-slate-400">—</span>}</td>
                      <td className="px-2 py-2 pt-4">{info.unit || "—"}</td>
                      {def.itemMode === "count" && <td className="px-2 py-2 pt-4 text-right">{item?.refId ? formatNumber(info.available) : "—"}</td>}
                      {cols.includes("available") && (
                        <td className="px-2 py-2"><span className={cn("block rounded-md px-2 py-2 text-right font-semibold", tinted.green)}>{item?.refId ? formatNumber(info.available) : "—"}</span></td>
                      )}
                      {cols.includes("currentStock") && <td className="px-2 py-2 pt-4 text-right">{item?.refId ? formatNumber(info.available) : "—"}</td>}
                      {cols.includes("poQty") && (
                        <td className="px-2 py-2"><Input type="number" min={0} aria-label={`PO quantity, line ${index + 1}`} className="text-right" {...register(`items.${index}.poQty`)} /></td>
                      )}
                      {cols.includes("receivedQty") && (
                        <td className="px-2 py-2">
                          <Input type="number" min={0} aria-label={`Received quantity, line ${index + 1}`} className="text-right" aria-invalid={lineErrors?.receivedQty ? true : undefined} {...register(`items.${index}.receivedQty`)} />
                          {lineErrors?.receivedQty && <p className="mt-1 text-xs text-red-600">{lineErrors.receivedQty.message}</p>}
                        </td>
                      )}
                      {showQty && (
                        <td className="px-2 py-2">
                          {def.itemMode === "count" ? (
                            <Input type="number" min={0} aria-label={`${ui.quantityLabel}, line ${index + 1}`} className={cn("text-right", tinted.yellow)} aria-invalid={lineErrors?.countedQty ? true : undefined} {...register(`items.${index}.countedQty`)} />
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              aria-label={`${ui.quantityLabel}, line ${index + 1}`}
                              className={cn("text-right font-semibold", cols.includes("rejectedQty") && tinted.green, cols.includes("newStock") && (inbound ? tinted.green : tinted.red))}
                              aria-invalid={lineErrors?.quantity ? true : undefined}
                              {...register(`items.${index}.quantity`)}
                            />
                          )}
                          {(lineErrors?.quantity || lineErrors?.countedQty) && <p className="mt-1 text-xs text-red-600">{(lineErrors.quantity ?? lineErrors.countedQty)?.message}</p>}
                        </td>
                      )}
                      {cols.includes("rejectedQty") && (
                        <td className="px-2 py-2"><span className={cn("block rounded-md px-2 py-2 text-right font-semibold", tinted.red)}>{formatNumber(info.rejected)}</span></td>
                      )}
                      {def.itemMode === "count" && (
                        <td className="px-2 py-2">
                          <span className={cn("block rounded-md px-2 py-2 text-right font-semibold", item?.countedQty === "" ? "text-slate-400" : info.variance < 0 ? tinted.red : info.variance > 0 ? tinted.green : "")}>
                            {item?.countedQty === "" ? "—" : info.variance > 0 ? `+${info.variance}` : info.variance}
                          </span>
                        </td>
                      )}
                      {cols.includes("newStock") && (
                        <td className="px-2 py-2"><span className={cn("block rounded-md px-2 py-2 text-right font-semibold", tinted.blue)}>{item?.refId ? formatNumber(info.newStock) : "—"}</span></td>
                      )}
                      {cols.includes("condition") && (
                        <td className="px-2 py-2">
                          <Select aria-label={`Condition, line ${index + 1}`} placeholder="Condition" options={["Serviceable", "For Repair", "Unserviceable"].map((value) => ({ label: value, value }))} {...register(`items.${index}.condition`)} />
                        </td>
                      )}
                      {cols.includes("unitCost") && <td className="px-2 py-2 pt-4 text-right">{item?.refId ? formatCurrency(info.unitCost) : "—"}</td>}
                      {cols.includes("amount") && <td className="px-2 py-2 pt-4 text-right font-semibold">{item?.refId ? formatCurrency(info.amount) : "—"}</td>}
                      {cols.includes("remarks") && (
                        <td className="px-2 py-2"><Input aria-label={`Remarks, line ${index + 1}`} placeholder="Remarks" {...register(`items.${index}.remarks`)} /></td>
                      )}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={lines.length === 1}
                          aria-label={`Remove line ${index + 1}`}
                          className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="-mx-4 -mb-4 mt-2 flex flex-wrap justify-end gap-8 rounded-b-lg border-t border-line bg-slate-50 px-4 py-3 text-[13px]">
            <span>Total Items: <b>{lines.length}</b></span>
            {def.itemMode === "count" ? (
              <span>Total Variance: <b className={totals.variance < 0 ? "text-red-600" : totals.variance > 0 ? "text-[#1f9d55]" : ""}>{totals.variance > 0 ? `+${totals.variance}` : totals.variance}</b></span>
            ) : cols.includes("newStock") ? (
              <span>Total Adjustment Qty: <b className={inbound ? "text-[#1f9d55]" : "text-red-600"}>{inbound ? "+" : "−"}{formatNumber(totals.quantity)}</b></span>
            ) : (
              <span>Total Quantity: <b>{formatNumber(totals.quantity)}</b></span>
            )}
          </div>
        </FormBlock>
        )}

        {wizard && step === 1 && counted === lines.length && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-4 py-3 text-[13px] text-[#1d4fa3]">
            <Info className="h-4 w-4 shrink-0" /> All items have been counted. You may review and submit the stock count.
          </div>
        )}

        {wizard && step === 2 && (
          <>
            <FormBlock title="Review Stock Count" icon={ListChecks}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total Items", value: lines.length, tone: "border-[#cfe0fb] bg-[#eaf2fe]" },
                  { label: "Counted Items", value: counted, tone: "border-[#cdeedb] bg-[#e8f7ee]" },
                  { label: "Items with Variance", value: withVariance, tone: "border-[#f8e3b5] bg-[#fdf5e3]" },
                  { label: "Total Variance (Qty)", value: totals.variance > 0 ? `+${totals.variance}` : totals.variance, tone: "border-[#f8d3d3] bg-[#fdeeee]" },
                ].map((card) => (
                  <div key={card.label} className={cn("rounded-lg border px-4 py-3", card.tone)}>
                    <p className="text-[13px] font-medium">{card.label}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="-mx-4 mt-4 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#f3f4f6] text-left text-xs font-bold">
                      <th className="px-4 py-2.5">#</th><th className="px-2 py-2.5">Item Code</th><th className="px-2 py-2.5">Item Description</th><th className="px-2 py-2.5">UoM</th>
                      <th className="px-2 py-2.5 text-right">System Qty</th><th className="px-2 py-2.5 text-right">Actual Count Qty</th><th className="px-2 py-2.5 text-right">Variance</th><th className="px-4 py-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(items ?? []).map((item, index) => {
                      const info = lineInfo(item);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                          <td className="px-2 py-2.5 font-semibold text-[#2f6fd6]">{productById.get(item.refId)?.sku}</td>
                          <td className="px-2 py-2.5">{info.description}</td>
                          <td className="px-2 py-2.5">{info.unit}</td>
                          <td className="px-2 py-2.5 text-right">{formatNumber(info.available)}</td>
                          <td className="px-2 py-2.5 text-right">{formatNumber(Number(item.countedQty) || 0)}</td>
                          <td className={cn("px-2 py-2.5 text-right font-semibold", info.variance < 0 && "text-red-600", info.variance > 0 && "text-[#1f9d55]")}>{info.variance > 0 ? `+${info.variance}` : info.variance}</td>
                          <td className="px-4 py-2.5 text-slate-600">{item.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-2.5" colSpan={4}>Total</td>
                      <td className="px-2 py-2.5 text-right">{formatNumber(systemTotal)}</td>
                      <td className="px-2 py-2.5 text-right">{formatNumber(actualTotal)}</td>
                      <td className={cn("px-2 py-2.5 text-right", totals.variance < 0 && "text-red-600")}>{totals.variance > 0 ? `+${totals.variance}` : totals.variance}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </FormBlock>
            <div className="grid gap-4 lg:grid-cols-2">
              <FormBlock title="Approval Workflow" icon={CheckCircle2}>
                <p className="mb-3 text-[13px] text-slate-600">You are about to submit this stock count for approval. It is routed in this order:</p>
                <ol className="space-y-2">
                  {def.approvals.map((role, index) => (
                    <li key={role} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold">{role} Approval</p>
                        <p className="text-xs text-slate-600">{index === def.approvals.length - 1 ? "Final review and approval for posting of stock count." : "Validate count results and recommend for final approval."}</p>
                      </div>
                      <Badge tone="warning">Pending</Badge>
                    </li>
                  ))}
                </ol>
              </FormBlock>
              <FormBlock title="Count Summary" icon={ListChecks}>
                <SummaryRows
                  rows={[
                    { label: "Total Items", value: lines.length },
                    { label: "Total System Qty", value: formatNumber(systemTotal) },
                    { label: "Total Actual Qty", value: formatNumber(actualTotal) },
                    { label: "Total Variance (Qty)", value: totals.variance > 0 ? `+${totals.variance}` : totals.variance, tone: totals.variance < 0 ? "red" : undefined },
                    { label: "Items with Variance", value: withVariance },
                  ]}
                />
                <label htmlFor="remarks" className="mt-3 block text-xs font-semibold text-slate-700">Remarks / Notes</label>
                <Textarea id="remarks" rows={3} className="mt-1" placeholder="Enter remarks (optional)" {...register("remarks")} />
              </FormBlock>
            </div>
          </>
        )}

        {wizard && step === 0 && (
          <FormBlock title="Notes" icon={FileText}>
            <label htmlFor="remarks" className="sr-only">Notes</label>
            <Textarea id="remarks" rows={3} placeholder="Enter notes (optional)" {...register("remarks")} />
          </FormBlock>
        )}

        {!wizard && (
        <div className="grid gap-4 lg:grid-cols-2">
          <FormBlock title={attachmentsLeft ? "Attachment(s)" : "Remarks"} icon={attachmentsLeft ? Paperclip : FileText}>
            {attachmentsLeft ? (
              <Attachments value={attachments} onChange={setAttachments} />
            ) : (
              <>
                <label htmlFor="remarks" className="sr-only">Remarks</label>
                <Textarea id="remarks" rows={4} placeholder="Enter remarks (optional)" {...register("remarks")} />
              </>
            )}
          </FormBlock>
          {ui.showAmount ? (
            <FormBlock title="Summary" icon={ListChecks}>
              <SummaryRows
                rows={
                  cols.includes("receivedQty")
                    ? [
                        { label: "Total PO Quantity", value: formatNumber(totals.poQty) },
                        { label: "Total Received", value: formatNumber(totals.received) },
                        { label: "Total Accepted", value: formatNumber(totals.quantity), tone: "green" },
                        { label: "Total Rejected", value: formatNumber(totals.rejected), tone: "red" },
                      ]
                    : [
                        { label: "Total Items", value: lines.length },
                        { label: "Total Quantity", value: formatNumber(totals.quantity) },
                      ]
                }
              />
              <TotalAmount value={formatCurrency(totals.amount)} />
              <label htmlFor="remarks" className="mt-3 block text-xs font-semibold text-slate-700">Remarks / Notes</label>
              <Textarea id="remarks" rows={2} className="mt-1" placeholder="Enter remarks (optional)" {...register("remarks")} />
            </FormBlock>
          ) : def.key === "stock-adjustments" ? (
            <FormBlock title="Remarks / Notes" icon={FileText}>
              <label htmlFor="remarks" className="sr-only">Remarks / Notes</label>
              <Textarea id="remarks" rows={4} placeholder="Enter remarks (optional)" {...register("remarks")} />
            </FormBlock>
          ) : (
            <FormBlock title="Approval Workflow" icon={CheckCircle2}>
              <div className="py-2">
                <HorizontalWorkflow requestor={fieldValues?.requestedBy || user?.name || "Requestor"} roles={def.approvals} />
              </div>
            </FormBlock>
          )}
        </div>

        )}

        {wizard ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-4 py-3">
            {step === 0 ? (
              <Button variant="outline" onClick={() => router.push(`/documents/${def.key}`)} disabled={isSubmitting} leftIcon={<X className="h-4 w-4" />}>Cancel</Button>
            ) : (
              <Button variant="outline" onClick={() => goTo(step - 1)} disabled={isSubmitting} leftIcon={<ArrowLeft className="h-4 w-4" />}>{step === 1 ? "Back: Setup" : "Back: Enter Count"}</Button>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={submit("draft")} disabled={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save as Draft</Button>
              {step < 2 ? (
                <Button onClick={() => goTo(step + 1)} leftIcon={<ArrowRight className="h-4 w-4" />}>{step === 0 ? "Next: Enter Count" : "Next: Review & Submit"}</Button>
              ) : (
                <Button type="submit" variant="success" loading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>Submit for Approval</Button>
              )}
            </div>
          </div>
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-4 py-3">
          <Button variant="outline" onClick={() => router.push(`/documents/${def.key}`)} disabled={isSubmitting} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to List</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={submit("draft")} disabled={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>Save as Draft</Button>
            <Button type="submit" variant={approver && ui.showAmount ? "outline" : "primary"} loading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>Submit for Approval</Button>
            {approver && ui.showAmount && (
              <Button variant="success" onClick={submit("post")} disabled={isSubmitting} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve and Post</Button>
            )}
          </div>
        </div>
        )}
      </form>
    </>
  );
}

/** Numbered wizard stepper shown in the header of the stock count form. */
function WizardSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Steps">
      {steps.map((label, index) => (
        <li key={label} className="flex items-center gap-2" aria-current={index === current ? "step" : undefined}>
          {index > 0 && <span className="h-px w-8 bg-slate-300" aria-hidden />}
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
              index < current && "bg-[#1f9d55] text-white",
              index === current && "bg-brand-600 text-white",
              index > current && "border border-slate-300 bg-white text-slate-500",
            )}
          >
            {index < current ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </span>
          <span className={cn("text-[13px] font-semibold", index === current ? "text-brand-600" : "text-slate-600")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function DocumentFormView({ type, id }: { type: string; id?: string }) {
  const def = getDocumentDef(type);
  const query = useGetDocumentQuery({ type, id: id ?? "" }, { skip: !id || !def });
  useBreadcrumbLabel(type, def?.ui.title);
  useBreadcrumbLabel(id, query.data?.number);
  if (!def) return <Unauthorized />;
  if (!id) return <DocumentForm key={def.key} def={def} />;
  return (
    <QueryBoundary {...query}>
      {(doc) => (doc.status === "draft" || doc.status === "rejected" ? <DocumentForm def={def} doc={doc} /> : <Unauthorized homeHref={`/documents/${type}/${doc.id}`} />)}
    </QueryBoundary>
  );
}
