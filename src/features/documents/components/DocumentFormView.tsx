"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Unauthorized } from "@/components/common/Unauthorized";
import { DynamicField, schemaForFields, toApiValues } from "@/components/forms/DynamicField";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getDocumentDef, type DocumentDef } from "@/config/documents";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { formatCurrency, todayISO } from "@/lib/utils/format";
import { useGetDocumentQuery, useSaveDocumentMutation } from "@/services/api/endpoints/documentsApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import type { TransactionDocument } from "@/types/records";
import { ApprovalWorkflow } from "./ApprovalWorkflow";

const itemSchema = z.object({
  refId: z.string().min(1, "Select an item."),
  quantity: z.string(),
  countedQty: z.string(),
  condition: z.string(),
  remarks: z.string(),
});

type FormValues = { date: string; remarks: string; fields: Record<string, string>; items: z.infer<typeof itemSchema>[] };

function buildSchema(def: DocumentDef) {
  const items = z
    .array(
      itemSchema.superRefine((item, ctx) => {
        if (def.itemMode === "stock" && !(Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0)) {
          ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter a quantity above 0." });
        }
        if (def.itemMode === "count" && (item.countedQty === "" || !Number.isInteger(Number(item.countedQty)) || Number(item.countedQty) < 0)) {
          ctx.addIssue({ code: "custom", path: ["countedQty"], message: "Enter the counted quantity." });
        }
      }),
    )
    .min(1, "Add at least one item.")
    .refine((rows) => new Set(rows.map((row) => row.refId)).size === rows.length, "Each item can appear only once.");
  return z.object({ date: z.string().min(1, "Date is required."), remarks: z.string(), fields: schemaForFields(def.fields), items });
}

function DocumentForm({ def, doc }: { def: DocumentDef; doc?: TransactionDocument }) {
  const router = useRouter();
  const toast = useToast();
  const [save, { error: mutationError }] = useSaveDocumentMutation();
  const schema = useMemo(() => buildSchema(def), [def]);
  const emptyItem = { refId: "", quantity: "1", countedQty: "", condition: "", remarks: "" };
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: doc?.date ?? todayISO(),
      remarks: doc?.remarks ?? "",
      fields: Object.fromEntries(def.fields.map((field) => [field.name, doc?.fields[field.name] === null || doc?.fields[field.name] === undefined ? "" : String(doc.fields[field.name])])),
      items: doc?.items.map((item) => ({ refId: item.refId, quantity: String(Math.abs(item.quantity)), countedQty: item.countedQty === undefined ? "" : String(item.countedQty), condition: item.condition ?? "", remarks: item.remarks ?? "" })) ?? [emptyItem],
    },
  });
  const { fields: lines, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const warehouseId = useWatch({ control, name: def.key === "stock-transfers" ? "fields.fromWarehouseId" : "fields.warehouseId" }) as string | undefined;

  // Stock totals are scoped to the selected warehouse so preparers see what is available.
  const { data: products } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name", warehouseId: warehouseId || undefined }, { skip: def.itemMode === "property" });
  const { options: propertyOptions } = useReferenceOptions(def.itemMode === "property" ? "properties" : undefined);
  const productById = useMemo(() => new Map((products?.data ?? []).map((product) => [product.id, product])), [products]);
  const options = def.itemMode === "property" ? propertyOptions : (products?.data ?? []).map((product) => ({ label: `${product.sku} — ${product.name}`, value: product.id }));
  const total = (items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (productById.get(item.refId)?.unitCost ?? 0), 0);

  const submit = (sendForApproval: boolean) =>
    handleSubmit(async (values) => {
      const body = {
        date: values.date,
        remarks: values.remarks || undefined,
        submit: sendForApproval,
        fields: toApiValues(def.fields, values.fields),
        items: values.items.map((item) => ({
          refId: item.refId,
          quantity: def.itemMode === "property" ? 1 : Number(item.quantity || 0),
          countedQty: def.itemMode === "count" ? Number(item.countedQty) : undefined,
          condition: item.condition || undefined,
          remarks: item.remarks || undefined,
        })),
      };
      try {
        const saved = await save({ type: def.key, id: doc?.id, body }).unwrap();
        toast.success(sendForApproval ? "Submitted for approval" : "Draft saved", `${saved.number} was saved.`);
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

  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  return (
    <>
      <PageHeader icon={FileText} title={doc ? `Edit ${doc.number}` : `New ${def.title}`} description={def.formName ?? def.description} />
      <form onSubmit={submit(true)} noValidate>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader title={`${def.title} Information`} />
              <CardContent>
                <FormErrorBanner error={nonFieldError(mutationError)} />
                <RequiredNote />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="Date" htmlFor="date" required error={errors.date?.message}>
                    <Input type="date" {...fieldA11y("date", errors.date?.message)} {...register("date")} />
                  </FormField>
                  {def.fields.map((field) => (
                    <DynamicField key={field.name} field={field} registration={register(`fields.${field.name}`)} error={errors.fields?.[field.name]?.message} />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader
                title={def.itemMode === "property" ? "Property Items" : "Items"}
                description={def.itemMode === "count" ? "System quantities are captured when you save. Enter what was physically counted." : undefined}
                actions={<Button size="sm" variant="secondary" onClick={() => append(emptyItem)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Add Item</Button>}
              />
              {itemsError && <p role="alert" className="px-5 pt-3 text-xs text-red-600">{itemsError}</p>}
              <ul className="divide-y divide-line">
                {lines.map((line, index) => {
                  const item = items?.[index];
                  const product = item ? productById.get(item.refId) : undefined;
                  const lineErrors = errors.items?.[index];
                  return (
                    <li key={line.id} className="grid gap-3 p-4 md:grid-cols-[1fr_130px_44px] md:items-start">
                      <div>
                        <label htmlFor={`items.${index}.refId`} className="sr-only">Item</label>
                        <Select id={`items.${index}.refId`} placeholder={def.itemMode === "property" ? "Select property" : "Select item"} options={options} aria-invalid={lineErrors?.refId ? true : undefined} {...register(`items.${index}.refId`)} />
                        {lineErrors?.refId && <p className="mt-1 text-xs text-red-600">{lineErrors.refId.message}</p>}
                        {product && (
                          <p className="mt-1 text-xs text-muted">
                            {warehouseId ? "Available here" : "On hand (all warehouses)"}: {product.totalStock} {product.unit} · {formatCurrency(product.unitCost)} / {product.unit}
                          </p>
                        )}
                        <Input aria-label={`Remarks for line ${index + 1}`} placeholder="Remarks (optional)" className="mt-2 h-9" {...register(`items.${index}.remarks`)} />
                      </div>
                      {def.itemMode === "stock" && (
                        <div>
                          <label htmlFor={`items.${index}.quantity`} className="text-xs text-muted md:sr-only">Quantity</label>
                          <Input id={`items.${index}.quantity`} type="number" min={1} className="text-right" aria-invalid={lineErrors?.quantity ? true : undefined} {...register(`items.${index}.quantity`)} />
                          {lineErrors?.quantity && <p className="mt-1 text-xs text-red-600">{lineErrors.quantity.message}</p>}
                        </div>
                      )}
                      {def.itemMode === "count" && (
                        <div>
                          <label htmlFor={`items.${index}.countedQty`} className="text-xs text-muted">Counted qty</label>
                          <Input id={`items.${index}.countedQty`} type="number" min={0} className="text-right" aria-invalid={lineErrors?.countedQty ? true : undefined} {...register(`items.${index}.countedQty`)} />
                          {lineErrors?.countedQty && <p className="mt-1 text-xs text-red-600">{lineErrors.countedQty.message}</p>}
                        </div>
                      )}
                      {def.itemMode === "property" && (
                        <div>
                          <label htmlFor={`items.${index}.condition`} className="text-xs text-muted md:sr-only">Condition</label>
                          <Select id={`items.${index}.condition`} placeholder="Condition" options={["Serviceable", "For Repair", "Unserviceable"].map((value) => ({ label: value, value }))} {...register(`items.${index}.condition`)} />
                        </div>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={lines.length === 1} aria-label={`Remove line ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              {def.itemMode === "stock" && (
                <div className="flex justify-end gap-6 border-t border-line bg-slate-50 px-5 py-3 text-sm">
                  <span className="text-muted">{lines.length} item(s)</span>
                  <span>Estimated amount <span className="ml-2 font-bold">{formatCurrency(total)}</span></span>
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Approval Workflow" description="This document is routed in this order." />
              <CardContent>
                <ApprovalWorkflow steps={def.approvals.map((role) => ({ role, status: "waiting" }))} compact />
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-muted">{def.effect}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Remarks" />
              <CardContent>
                <label htmlFor="remarks" className="sr-only">Remarks</label>
                <Textarea id="remarks" rows={4} placeholder="Notes for approvers" {...register("remarks")} />
              </CardContent>
              <CardFooter className="flex-wrap">
                <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
                <Button variant="secondary" onClick={submit(false)} disabled={isSubmitting}>Save as Draft</Button>
                <Button type="submit" loading={isSubmitting}>Submit for Approval</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </>
  );
}

export function DocumentFormView({ type, id }: { type: string; id?: string }) {
  const def = getDocumentDef(type);
  const query = useGetDocumentQuery({ type, id: id ?? "" }, { skip: !id || !def });
  useBreadcrumbLabel(type, def?.title);
  useBreadcrumbLabel(id, query.data?.number);
  if (!def) return <Unauthorized />;
  if (!id) return <DocumentForm key={def.key} def={def} />;
  return (
    <QueryBoundary {...query}>
      {(doc) => (doc.status === "draft" || doc.status === "rejected" ? <DocumentForm def={def} doc={doc} /> : <Unauthorized homeHref={`/documents/${type}/${doc.id}`} />)}
    </QueryBoundary>
  );
}
