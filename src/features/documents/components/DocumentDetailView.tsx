"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Pencil, Printer, Send, Undo2, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Unauthorized } from "@/components/common/Unauthorized";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getDocumentDef, type DocumentDef } from "@/config/documents";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { isApiError } from "@/lib/utils/errors";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useDocumentActionMutation, useGetDocumentQuery } from "@/services/api/endpoints/documentsApi";
import type { DocumentItem, TransactionDocument } from "@/types/records";
import { ApprovalWorkflow } from "./ApprovalWorkflow";

function DocumentDetail({ def, doc }: { def: DocumentDef; doc: TransactionDocument }) {
  const toast = useToast();
  const { can } = usePermissions();
  const [act, { isLoading }] = useDocumentActionMutation();
  const [dialog, setDialog] = useState<"approve" | "reject" | "cancel" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const pending = doc.approvals.find((step) => step.status === "pending");
  const editable = doc.status === "draft" || doc.status === "rejected";

  const run = async (action: "submit" | "approve" | "reject" | "cancel") => {
    try {
      const result = await act({ type: def.key, id: doc.id, action, remarks: remarks || undefined }).unwrap();
      const messages = {
        submit: ["Submitted for approval", `${doc.number} is now with ${result.approvals[0]?.role}.`],
        approve: result.status === "posted" ? ["Approved and posted", `${doc.number} is complete. ${def.effect}`] : ["Approved", `${doc.number} moved to ${result.approvals.find((step) => step.status === "pending")?.role}.`],
        reject: ["Returned to preparer", doc.number],
        cancel: ["Document cancelled", doc.number],
      } as const;
      toast.success(messages[action][0], messages[action][1]);
      setDialog(null);
      setRemarks("");
    } catch (error) {
      if (isApiError(error) && error.errors?.remarks) setRemarksError(error.errors.remarks[0]);
      else {
        toast.error("Action failed", error);
        setDialog(null);
      }
    }
  };

  const columns: Column<DocumentItem>[] = [
    { key: "code", header: def.itemMode === "property" ? "Property No." : "Item Code", cell: (item) => <span className="font-mono text-xs">{item.code}</span> },
    { key: "description", header: "Description", cell: (item) => <span className="font-medium">{item.description}</span> },
    ...(def.itemMode === "count"
      ? [
          { key: "systemQty", header: "System Qty", align: "right" as const, cell: (item: DocumentItem) => formatNumber(item.systemQty ?? 0) },
          { key: "countedQty", header: "Counted Qty", align: "right" as const, cell: (item: DocumentItem) => formatNumber(item.countedQty ?? 0) },
          {
            key: "variance",
            header: "Variance",
            align: "right" as const,
            cell: (item: DocumentItem) => <span className={item.quantity < 0 ? "font-semibold text-red-600" : item.quantity > 0 ? "font-semibold text-emerald-700" : ""}>{item.quantity > 0 ? `+${item.quantity}` : item.quantity}</span>,
          },
        ]
      : def.itemMode === "property"
        ? [{ key: "condition", header: "Condition", cell: (item: DocumentItem) => item.condition ?? "—" }]
        : [{ key: "quantity", header: "Quantity", align: "right" as const, cell: (item: DocumentItem) => `${formatNumber(item.quantity)} ${item.unit ?? ""}` }]),
    { key: "unitCost", header: def.itemMode === "property" ? "Acquisition Cost" : "Unit Cost", align: "right", hideOnMobile: true, cell: (item) => formatCurrency(item.unitCost ?? 0) },
    { key: "remarks", header: "Remarks", hideOnMobile: true, cell: (item) => <span className="text-muted">{item.remarks ?? "—"}</span> },
  ];

  return (
    <>
      <ProfileHeader
        name={doc.number}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600"><FileText className="h-7 w-7" /></span>}
        subtitle={def.formName ?? def.title}
        badges={<StatusBadge status={doc.status} />}
        meta={[
          { label: "Date", value: formatDate(doc.date) },
          { label: "Prepared by", value: doc.createdBy },
          { label: def.itemMode === "property" ? "Property items" : "Total quantity", value: def.itemMode === "property" ? doc.items.length : formatNumber(doc.totalQuantity ?? 0) },
          { label: "Amount", value: formatCurrency(doc.totalAmount ?? 0) },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
            {editable && (
              <Can permission={def.createPermission}>
                <ButtonLink href={`/documents/${def.key}/${doc.id}/edit`} variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
                <Button onClick={() => run("submit")} loading={isLoading} leftIcon={<Send className="h-4 w-4" />}>Submit for Approval</Button>
              </Can>
            )}
            {doc.status === "pending" && can(def.approvePermission) && (
              <>
                <Button variant="outline" className="text-red-600" onClick={() => setDialog("reject")} leftIcon={<Undo2 className="h-4 w-4" />}>Return</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog("approve")} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  {pending && doc.approvals.indexOf(pending) === doc.approvals.length - 1 ? "Approve & Post" : "Approve"}
                </Button>
              </>
            )}
            {doc.status !== "posted" && doc.status !== "cancelled" && (
              <Can permission={def.createPermission}>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDialog("cancel")} leftIcon={<XCircle className="h-4 w-4" />}>Cancel</Button>
              </Can>
            )}
          </>
        }
      />
      {pending && (
        <div role="status" className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Awaiting <strong>{pending.role}</strong> approval. {can(def.approvePermission) ? "Review the items below, then approve or return." : "You will be notified when it moves forward."}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={`${def.title} Information`} />
            <CardContent>
              <DetailList
                columns={3}
                items={[
                  { label: `${def.prefix} No.`, value: doc.number },
                  { label: "Date", value: formatDate(doc.date) },
                  ...def.fields.map((field) => ({
                    label: field.label,
                    value: doc.labels?.[field.name] ?? (field.type === "currency" ? formatCurrency(Number(doc.fields[field.name] ?? 0)) : field.type === "date" ? formatDate(String(doc.fields[field.name] ?? "")) : String(doc.fields[field.name] ?? "—")),
                  })),
                  { label: "Remarks", value: doc.remarks, wide: true },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Items (${doc.items.length})`} />
            <DataTable caption="Document items" columns={columns} rows={doc.items} rowKey={(item) => item.refId} mobileTitleKey="description" />
            <div className="flex justify-end gap-6 border-t border-line px-5 py-3 text-sm">
              <span>Total quantity <strong className="ml-1">{formatNumber(doc.totalQuantity ?? 0)}</strong></span>
              <span>Total amount <strong className="ml-1">{formatCurrency(doc.totalAmount ?? 0)}</strong></span>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Approval Workflow" />
            <CardContent>
              <ApprovalWorkflow steps={doc.approvals} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Document History" />
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted">Created:</span> {formatDateTime(doc.createdAt)} by {doc.createdBy}</p>
              <p><span className="text-muted">Last updated:</span> {formatDateTime(doc.updatedAt)}</p>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-muted">{def.effect}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal
        open={dialog === "approve" || dialog === "reject"}
        onClose={() => setDialog(null)}
        title={dialog === "approve" ? `Approve as ${pending?.role ?? "approver"}` : "Return to preparer"}
        description={dialog === "approve" ? (pending && doc.approvals.indexOf(pending) === doc.approvals.length - 1 ? `This is the final approval. ${def.effect}` : "The document moves to the next approver.") : "Explain what needs to be corrected."}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isLoading}>Cancel</Button>
            {dialog === "approve" ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" loading={isLoading} onClick={() => run("approve")}>Approve</Button>
            ) : (
              <Button variant="danger" loading={isLoading} onClick={() => (remarks.trim() ? run("reject") : setRemarksError("Give a reason so the preparer can correct it."))}>Return</Button>
            )}
          </>
        }
      >
        <label htmlFor="action-remarks" className="text-sm font-medium">
          Remarks {dialog === "reject" && <span className="text-red-600">*</span>}
        </label>
        <Textarea id="action-remarks" className="mt-1.5" rows={3} value={remarks} aria-invalid={remarksError ? true : undefined} onChange={(event) => { setRemarks(event.target.value); setRemarksError(""); }} />
        {remarksError && <p role="alert" className="mt-1 text-xs text-red-600">{remarksError}</p>}
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
  useBreadcrumbLabel(type, def?.title);
  useBreadcrumbLabel(id, query.data?.number);
  if (!def) return <Unauthorized />;
  return <QueryBoundary {...query}>{(doc) => <DocumentDetail def={def} doc={doc} />}</QueryBoundary>;
}
