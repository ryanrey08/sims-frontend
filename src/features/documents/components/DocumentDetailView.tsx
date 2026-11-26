"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Clock, FileText, Info, ListChecks, Package, Paperclip, Pencil, Printer, Send, UserCheck, X, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { ModalIcon } from "@/components/common/SuccessDialog";
import { Unauthorized } from "@/components/common/Unauthorized";
import { FormBlock } from "@/components/forms/HField";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { displayStatus, getDocumentDef, type DocumentDef } from "@/config/documents";
import { STATUS_META } from "@/constants/status";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { isApiError } from "@/lib/utils/errors";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useDocumentActionMutation, useGetDocumentQuery } from "@/services/api/endpoints/documentsApi";
import type { DocumentItem, TransactionDocument } from "@/types/records";
import { ApprovalWorkflow } from "./ApprovalWorkflow";
import { Attachments } from "./Attachments";
import { DocStatus, SummaryRows, TotalAmount } from "./parts";

const MAX_REMARKS = 500;

/** Item columns for the read-only views, following each form's mockup. */
function itemColumns(def: DocumentDef) {
  const cols: { key: string; label: string; align?: "right"; cell: (item: DocumentItem) => React.ReactNode }[] = [];
  const signed = (value: number) => (value > 0 ? `+${formatNumber(value)}` : formatNumber(value));
  const pill = (tone: "green" | "red" | "blue", value: React.ReactNode) => (
    <span className={cn("inline-block min-w-14 rounded-md px-2 py-1 text-right font-semibold", tone === "green" && "bg-[#e8f7ee] text-[#1a7f46]", tone === "red" && "bg-[#fdeeee] text-red-600", tone === "blue" && "bg-[#eaf2fe] text-[#2f6fd6]")}>{value}</span>
  );
  if (def.itemMode === "count") {
    cols.push({ key: "systemQty", label: "System Qty", align: "right", cell: (item) => formatNumber(item.systemQty ?? 0) });
    cols.push({ key: "countedQty", label: "Actual Count Qty", align: "right", cell: (item) => formatNumber(item.countedQty ?? 0) });
    cols.push({ key: "variance", label: "Variance", align: "right", cell: (item) => pill(item.quantity < 0 ? "red" : "green", signed(item.quantity)) });
  } else if (def.itemMode === "property") {
    cols.push({ key: "condition", label: "Condition", cell: (item) => item.condition ?? "—" });
  } else if (def.ui.itemColumns.includes("receivedQty")) {
    cols.push({ key: "poQty", label: "PO Qty", align: "right", cell: (item) => formatNumber(item.poQty ?? item.quantity) });
    cols.push({ key: "receivedQty", label: "Received Qty", align: "right", cell: (item) => formatNumber(item.receivedQty ?? item.quantity) });
    cols.push({ key: "quantity", label: "Accepted Qty", align: "right", cell: (item) => pill("green", formatNumber(item.quantity)) });
    cols.push({ key: "rejectedQty", label: "Rejected Qty", align: "right", cell: (item) => pill("red", formatNumber(item.rejectedQty ?? 0)) });
  } else if (def.key === "stock-adjustments") {
    cols.push({ key: "quantity", label: def.ui.quantityLabel, align: "right", cell: (item) => pill("green", signed(item.quantity)) });
  } else {
    cols.push({ key: "quantity", label: def.ui.quantityLabel, align: "right", cell: (item) => <b>{formatNumber(item.quantity)}</b> });
  }
  if (def.ui.itemColumns.includes("unitCost")) cols.push({ key: "unitCost", label: def.itemMode === "property" ? "Acquisition Cost" : "Unit Cost", align: "right", cell: (item) => formatCurrency(item.unitCost ?? 0) });
  if (def.ui.itemColumns.includes("amount")) cols.push({ key: "amount", label: "Amount", align: "right", cell: (item) => <b>{formatCurrency(Math.abs(item.quantity) * (item.unitCost ?? 0))}</b> });
  if (def.ui.itemColumns.includes("remarks")) cols.push({ key: "remarks", label: "Remarks", cell: (item) => <span className="text-slate-600">{item.remarks ?? "—"}</span> });
  return cols;
}

function CurrentStatus({ def, doc }: { def: DocumentDef; doc: TransactionDocument }) {
  const pending = doc.approvals.find((step) => step.status === "pending");
  const status = displayStatus(def, doc);
  const tone = pending ? "yellow" : doc.status === "posted" ? "green" : doc.status === "rejected" || doc.status === "cancelled" ? "red" : "gray";
  const Icon = pending ? Clock : doc.status === "posted" ? CheckCircle2 : doc.status === "rejected" || doc.status === "cancelled" ? XCircle : FileText;
  return (
    <div>
      <p className="mb-2 text-[13px] font-bold text-ink">Current Status</p>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] font-bold",
          tone === "yellow" && "border-[#f8e3b5] bg-[#fdf5e3] text-[#b7791f]",
          tone === "green" && "border-[#cdeedb] bg-[#e8f7ee] text-[#1a7f46]",
          tone === "red" && "border-red-200 bg-red-50 text-red-700",
          tone === "gray" && "border-line bg-slate-50 text-slate-700",
        )}
      >
        <Icon className="h-6 w-6 shrink-0" />
        {pending ? `For ${pending.role} Approval` : (STATUS_META[status]?.label ?? status)}
      </div>
    </div>
  );
}

/**
 * Document detail and role approval page (p11–p13, p18, p24, p36): information with the current
 * status, items, the vertical approval workflow, requester remarks and the approver's action card.
 */
function DocumentDetail({ def, doc }: { def: DocumentDef; doc: TransactionDocument }) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const { ui } = def;
  const [act, { isLoading }] = useDocumentActionMutation();
  const [dialog, setDialog] = useState<"approve" | "cancel" | null>(searchParams.get("approve") && doc.status === "pending" ? "approve" : null);
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const pending = doc.approvals.find((step) => step.status === "pending");
  const pendingIndex = pending ? doc.approvals.indexOf(pending) : -1;
  const lastStep = pendingIndex === doc.approvals.length - 1;
  const editable = doc.status === "draft" || doc.status === "rejected";
  const approver = doc.status === "pending" && can(def.approvePermission);
  const approveLabel = lastStep ? "Approve & Post" : "Approve";

  useEffect(() => {
    if (searchParams.get("print")) window.setTimeout(() => window.print(), 300);
  }, [searchParams]);

  const run = async (action: "submit" | "approve" | "reject" | "cancel") => {
    try {
      const result = await act({ type: def.key, id: doc.id, action, remarks: remarks.trim() || undefined }).unwrap();
      const messages = {
        submit: ["Submitted for approval", `${doc.number} is now with ${result.approvals[0]?.role}.`],
        approve: result.status === "posted" ? ["Approved and posted", `${doc.number} is complete. ${def.effect}`] : ["Approved", `${doc.number} moved to ${result.approvals.find((step) => step.status === "pending")?.role}.`],
        reject: ["Rejected and returned", `${doc.number} was returned to the preparer.`],
        cancel: ["Document cancelled", doc.number],
      } as const;
      toast.success(messages[action][0], messages[action][1]);
      setDialog(null);
      setRemarks("");
      if (searchParams.get("approve")) router.replace(`/documents/${def.key}/${doc.id}`);
    } catch (error) {
      if (isApiError(error) && error.errors?.remarks) setRemarksError(error.errors.remarks[0]);
      else {
        toast.error("Action failed", error);
        setDialog(null);
      }
    }
  };

  const reject = () => {
    if (!remarks.trim()) {
      setRemarksError("Enter your remarks so the preparer knows what to correct.");
      document.getElementById("approval-remarks")?.focus();
      return;
    }
    void run("reject");
  };

  const mainFields = def.fields.filter((field) => field.group !== "side");
  const sideFields = def.fields.filter((field) => field.group === "side");
  const value = (name: string) => {
    const field = def.fields.find((item) => item.name === name);
    const raw = doc.fields[name];
    if (doc.labels?.[name]) return doc.labels[name];
    if (raw === null || raw === undefined || raw === "") return "—";
    if (field?.type === "date") return formatDate(String(raw));
    if (field?.type === "currency") return formatCurrency(Number(raw));
    return String(raw);
  };
  const info = [
    { label: ui.numberLabel, value: <span className="text-brand-600">{doc.number}</span> },
    { label: def.key === "stock-transfers" ? "Transfer Date" : "Date", value: formatDate(doc.date) },
    ...mainFields.filter((field) => field.type !== "textarea").map((field) => ({ label: field.label, value: value(field.name) })),
    ...sideFields.map((field) => ({ label: field.label, value: value(field.name) })),
    { label: "Prepared By", value: doc.createdBy },
  ];
  const half = Math.ceil(info.length / 2);
  const columns = itemColumns(def);
  const priorRoles = doc.approvals.slice(0, Math.max(0, pendingIndex)).map((step) => step.role);
  const requesterRemarks = [doc.remarks, ...mainFields.filter((field) => field.type === "textarea").map((field) => (doc.fields[field.name] ? `${field.label}: ${doc.fields[field.name]}` : ""))].filter(Boolean).join("\n");
  const lastApproval = [...doc.approvals].reverse().find((step) => step.status === "approved");

  return (
    <>
      <PageHeader
        icon={approver ? UserCheck : FileText}
        title={approver && pending ? `${pending.role} Approval` : `${ui.title} Details`}
        description={approver ? `Review, validate, and approve/reject the ${def.singular} request.` : `${ui.numberLabel} ${doc.number} · ${def.formName ?? ui.subtitle}`}
        aside={!approver ? <DocStatus def={def} doc={doc} /> : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/documents/${def.key}`)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {approver ? "Back to Approvals" : "Back to List"}
            </Button>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
            {editable && (
              <Can permission={def.createPermission}>
                <ButtonLink href={`/documents/${def.key}/${doc.id}/edit`} variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
                <Button onClick={() => run("submit")} loading={isLoading} leftIcon={<Send className="h-4 w-4" />}>Submit for Approval</Button>
              </Can>
            )}
            {approver && (
              <>
                <Button variant="danger" onClick={reject} disabled={isLoading} leftIcon={<X className="h-4 w-4" />}>Reject</Button>
                <Button variant="success" onClick={() => setDialog("approve")} disabled={isLoading} leftIcon={<Check className="h-4 w-4" />}>{approveLabel}</Button>
              </>
            )}
          </>
        }
      />

      {approver && pendingIndex > 0 && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-4 py-3 text-[13px] text-[#1d4fa3]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This {def.singular} has been validated by the {priorRoles.join(" and ")}. As {pending?.role}, please confirm the accuracy
            {lastStep ? " and approve for posting." : " and approve to forward it to the next approver."}
          </p>
        </div>
      )}
      {doc.status === "posted" && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-lg border border-[#cdeedb] bg-[#e8f7ee] px-4 py-3 text-[13px] text-[#1a7f46]">
          <CheckCircle2 className="h-7 w-7 shrink-0" />
          <p>
            <b>Approved</b> — This {def.singular} has been approved and posted{lastApproval?.at ? ` on ${formatDateTime(lastApproval.at)}` : ""}. {def.effect}
          </p>
        </div>
      )}
      {doc.status === "rejected" && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <p>Returned by {doc.approvals.find((step) => step.status === "rejected")?.role}: “{doc.approvals.find((step) => step.status === "rejected")?.remarks}”. Edit the document and submit it again.</p>
        </div>
      )}

      <div className="space-y-4">
        <FormBlock title={ui.infoTitle} icon={FileText}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
            {[info.slice(0, half), info.slice(half)].map((group, index) => (
              <dl key={index} className="space-y-2.5 text-[13px]">
                {group.map((item) => (
                  <div key={item.label} className="grid grid-cols-[150px_1fr] gap-2">
                    <dt className="text-slate-600">{item.label}</dt>
                    <dd className="font-semibold text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ))}
            <CurrentStatus def={def} doc={doc} />
          </div>
        </FormBlock>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <FormBlock title={`${ui.itemsTitle} (${doc.items.length})`} icon={Package}>
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="bg-[#f3f4f6] text-left text-xs font-bold text-ink">
                    <th className="w-10 px-4 py-2.5">#</th>
                    <th className="px-2 py-2.5">{def.itemMode === "property" ? "Property No." : "Item Code"}</th>
                    <th className="px-2 py-2.5">{def.itemMode === "property" ? "Description" : "Item Description"}</th>
                    <th className="px-2 py-2.5">UoM</th>
                    {columns.map((column) => (
                      <th key={column.key} className={cn("px-2 py-2.5", column.align === "right" && "text-right")}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {doc.items.map((item, index) => (
                    <tr key={item.refId}>
                      <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                      <td className="px-2 py-2.5 font-semibold text-[#2f6fd6]">{item.code}</td>
                      <td className="px-2 py-2.5">{item.description}</td>
                      <td className="px-2 py-2.5">{item.unit ?? "—"}</td>
                      {columns.map((column) => (
                        <td key={column.key} className={cn("px-2 py-2.5", column.align === "right" && "text-right")}>{column.cell(item)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="-mx-4 -mb-4 mt-2 flex flex-wrap justify-end gap-8 rounded-b-lg border-t border-line bg-slate-50 px-4 py-3 text-[13px]">
              <span>Total Items: <b>{doc.items.length}</b></span>
              {def.itemMode === "count" ? (
                <span>Total Variance: <b>{formatNumber(doc.items.reduce((sum, item) => sum + item.quantity, 0))}</b></span>
              ) : (
                <span>Total Quantity: <b>{formatNumber(doc.totalQuantity ?? 0)}</b></span>
              )}
              {ui.showAmount && <span>Total Amount: <b className="text-brand-600">{formatCurrency(doc.totalAmount ?? 0)}</b></span>}
            </div>
          </FormBlock>
          <FormBlock title="Approval Workflow" icon={ListChecks}>
            <ApprovalWorkflow steps={doc.approvals} currentNote={lastStep ? "For final acknowledgement and posting" : "For Approval"} />
          </FormBlock>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <FormBlock title={pendingIndex > 0 ? `Remarks from ${doc.approvals[pendingIndex - 1].role}` : "Remarks from Requester"} icon={FileText}>
              <Textarea
                readOnly
                rows={3}
                aria-label="Remarks from requester"
                className="bg-slate-50"
                value={(pendingIndex > 0 ? doc.approvals[pendingIndex - 1].remarks : null) ?? (requesterRemarks || "No remarks.")}
              />
            </FormBlock>
            {(doc.attachments?.length ?? 0) > 0 && (
              <FormBlock title={`Attachments (${doc.attachments?.length})`} icon={Paperclip}>
                <Attachments value={doc.attachments ?? []} readOnly />
              </FormBlock>
            )}
          </div>
          {approver ? (
            <FormBlock title={`${pending?.role} Action`} icon={Pencil}>
              <label htmlFor="approval-remarks" className="text-[13px] font-semibold">
                Approval Remarks <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="approval-remarks"
                className="mt-1.5"
                rows={4}
                maxLength={MAX_REMARKS}
                placeholder="Enter your remarks (required when rejecting)"
                value={remarks}
                aria-invalid={remarksError ? true : undefined}
                onChange={(event) => {
                  setRemarks(event.target.value);
                  setRemarksError("");
                }}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span role="alert" className="text-red-600">{remarksError}</span>
                <span className="text-slate-500">{remarks.length} / {MAX_REMARKS}</span>
              </div>
            </FormBlock>
          ) : ui.showAmount ? (
            <FormBlock title="Summary" icon={ListChecks}>
              <SummaryRows
                rows={[
                  { label: "Total Items", value: doc.items.length },
                  { label: "Total Quantity", value: formatNumber(doc.totalQuantity ?? 0) },
                  { label: "Prepared By", value: doc.createdBy },
                  { label: "Last Updated", value: formatDateTime(doc.updatedAt) },
                ]}
              />
              <TotalAmount value={formatCurrency(doc.totalAmount ?? 0)} />
            </FormBlock>
          ) : (
            <FormBlock title="Document History" icon={Clock}>
              <SummaryRows
                rows={[
                  { label: "Created", value: `${formatDateTime(doc.createdAt)} by ${doc.createdBy}` },
                  { label: "Last updated", value: formatDateTime(doc.updatedAt) },
                  { label: "On posting", value: <span className="font-normal">{def.effect}</span> },
                ]}
              />
              {doc.status !== "posted" && doc.status !== "cancelled" && (
                <Can permission={def.createPermission}>
                  <Button variant="outline" size="sm" className="mt-4 text-red-600" onClick={() => setDialog("cancel")} leftIcon={<XCircle className="h-4 w-4" />}>Cancel Document</Button>
                </Can>
              )}
            </FormBlock>
          )}
        </div>
      </div>

      <Modal
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        size="lg"
        icon={<ModalIcon><Check className="h-5 w-5" strokeWidth={3} /></ModalIcon>}
        title={lastStep ? `Approve and Post ${ui.title}` : `Approve ${ui.title}`}
        description={lastStep ? `Confirm approval and post this ${def.singular} to update inventory records.` : `Confirm your approval. The ${def.singular} moves to ${doc.approvals[pendingIndex + 1]?.role ?? "the next approver"}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isLoading} leftIcon={<X className="h-4 w-4" />}>Cancel</Button>
            <Button variant="success" loading={isLoading} onClick={() => run("approve")} leftIcon={<Check className="h-4 w-4" />}>{lastStep ? "Approve and Post" : "Approve"}</Button>
          </>
        }
      >
        <div className="grid gap-3 rounded-lg border border-line bg-slate-50 p-3 text-[13px] sm:grid-cols-3">
          {info.slice(0, 6).map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f3f4f6] text-left text-xs font-bold">
                <th className="px-3 py-2">Item Code</th>
                <th className="px-3 py-2">Description</th>
                {columns.slice(0, 3).map((column) => (
                  <th key={column.key} className={cn("px-3 py-2", column.align === "right" && "text-right")}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.items.map((item) => (
                <tr key={item.refId}>
                  <td className="px-3 py-2 font-semibold text-[#2f6fd6]">{item.code}</td>
                  <td className="px-3 py-2">{item.description}</td>
                  {columns.slice(0, 3).map((column) => (
                    <td key={column.key} className={cn("px-3 py-2", column.align === "right" && "text-right")}>{column.cell(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ui.showAmount && <TotalAmount label={def.ui.itemColumns.includes("receivedQty") ? "Total Amount (Accepted Items)" : "Total Amount"} value={formatCurrency(doc.totalAmount ?? 0)} />}
        <label htmlFor="modal-remarks" className="mt-4 block text-[13px] font-semibold">Approval Remarks</label>
        <Textarea id="modal-remarks" className="mt-1.5" rows={3} maxLength={MAX_REMARKS} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Enter remarks (optional)" />
        <p className="mt-1 text-right text-xs text-slate-500">{remarks.length} / {MAX_REMARKS}</p>
        {lastStep && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-3 py-2 text-xs text-[#1d4fa3]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Upon approval, the system will post this {def.singular}. {def.effect}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={dialog === "cancel"}
        title="Cancel document?"
        description={`${doc.number} will be cancelled and cannot be posted.`}
        confirmLabel="Cancel document"
        loading={isLoading}
        onConfirm={() => run("cancel")}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

export function DocumentDetailView({ type, id }: { type: string; id: string }) {
  const def = getDocumentDef(type);
  const query = useGetDocumentQuery({ type, id }, { skip: !def });
  useBreadcrumbLabel(type, def?.ui.title);
  useBreadcrumbLabel(id, query.data?.number);
  if (!def) return <Unauthorized />;
  return <QueryBoundary {...query}>{(doc) => <DocumentDetail def={def} doc={doc} />}</QueryBoundary>;
}
