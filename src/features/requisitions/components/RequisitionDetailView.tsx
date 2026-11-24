"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ClipboardList, PackageMinus, Printer, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useToast } from "@/hooks/useToast";
import { isApiError } from "@/lib/utils/errors";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import {
  useGetRequisitionQuery,
  useIssueRequisitionMutation,
  useUpdateRequisitionStatusMutation,
} from "@/services/api/endpoints/requisitionsApi";
import type { Requisition, RequisitionItem } from "@/types/models";

function IssueDialog({ requisition, onClose }: { requisition: Requisition; onClose: () => void }) {
  const toast = useToast();
  const [issue, { isLoading }] = useIssueRequisitionMutation();
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(requisition.items.map((item) => [item.productId, String(Math.min(item.quantity, item.available ?? 0))])),
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const onSubmit = async () => {
    setErrors({});
    try {
      const saved = await issue({ id: requisition.id, items: requisition.items.map((item) => ({ productId: item.productId, quantity: Number(quantities[item.productId] || 0) })) }).unwrap();
      toast.success("Supplies issued", `${saved.reqNumber}: stock deducted from ${saved.warehouseName}.`);
      onClose();
    } catch (error) {
      if (isApiError(error) && error.errors) setErrors(error.errors);
      else toast.error("Could not issue supplies", error);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Issue ${requisition.reqNumber}`}
      description={`Quantities are deducted from ${requisition.warehouseName}. Issue less than requested if stock is short.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={onSubmit} loading={isLoading}>Issue supplies</Button>
        </>
      }
    >
      <ul className="divide-y divide-line rounded-lg border border-line">
        {requisition.items.map((item, index) => {
          const error = errors[`items.${index}.quantity`]?.[0];
          return (
            <li key={item.productId} className="flex items-center gap-3 p-3">
              <label htmlFor={`issue-${item.productId}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.productName}</span>
                <span className="text-xs text-muted">Requested {item.quantity} · available {item.available} {item.unit}</span>
                {error && <span className="block text-xs text-red-600">{error}</span>}
              </label>
              <Input
                id={`issue-${item.productId}`}
                type="number"
                min={0}
                max={Math.min(item.quantity, item.available ?? 0)}
                value={quantities[item.productId]}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.productId]: event.target.value }))}
                className="w-24 text-right"
              />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

function RequisitionDetail({ requisition }: { requisition: Requisition }) {
  const toast = useToast();
  const [updateStatus, { isLoading }] = useUpdateRequisitionStatusMutation();
  const [dialog, setDialog] = useState<"issue" | "reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const change = async (status: "approved" | "rejected" | "cancelled", remarks?: string) => {
    try {
      await updateStatus({ id: requisition.id, status, remarks }).unwrap();
      toast.success(`Requisition ${status}`, requisition.reqNumber);
      setDialog(null);
    } catch (error) {
      if (isApiError(error) && error.errors?.remarks) setReasonError(error.errors.remarks[0]);
      else toast.error("Could not update requisition", error);
    }
  };

  const columns: Column<RequisitionItem>[] = [
    { key: "productName", header: "Product", cell: (row) => (
      <Link href={`/products/${row.productId}`} className="hover:underline">
        <span className="block font-medium">{row.productName}</span>
        <span className="font-mono text-xs text-muted">{row.sku}</span>
      </Link>
    ) },
    { key: "quantity", header: "Requested", align: "right", cell: (row) => `${row.quantity} ${row.unit}` },
    { key: "available", header: "Available", align: "right", cell: (row) => (
      <span className={(row.available ?? 0) < row.quantity && requisition.status !== "issued" ? "font-semibold text-amber-700" : ""}>{row.available}</span>
    ) },
    { key: "issuedQuantity", header: "Issued", align: "right", cell: (row) => (requisition.status === "issued" ? <span className="font-semibold">{row.issuedQuantity}</span> : "—") },
  ];

  return (
    <>
      <ProfileHeader
        name={requisition.reqNumber}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900"><ClipboardList className="h-7 w-7" /></span>}
        subtitle={`${requisition.department} · requested by ${requisition.requestedBy}`}
        badges={<><StatusBadge status={requisition.status} /><StatusBadge status={requisition.priority} /></>}
        meta={[
          { label: "Issue from", value: requisition.warehouseName },
          { label: "Needed by", value: formatDate(requisition.neededBy) },
          { label: "Items", value: requisition.itemCount },
          { label: "Submitted", value: formatDate(requisition.createdAt) },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
            {requisition.status === "pending" && (
              <Can permission={PERMISSIONS.requisitionsApprove}>
                <Button onClick={() => change("approved")} loading={isLoading} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve</Button>
                <Button variant="outline" className="text-red-600" onClick={() => setDialog("reject")} leftIcon={<XCircle className="h-4 w-4" />}>Reject</Button>
              </Can>
            )}
            {requisition.status === "approved" && (
              <Can permission={PERMISSIONS.requisitionsApprove}>
                <Button onClick={() => setDialog("issue")} leftIcon={<PackageMinus className="h-4 w-4" />}>Issue supplies</Button>
              </Can>
            )}
            {(requisition.status === "pending" || requisition.status === "approved") && (
              <Can permission={PERMISSIONS.requisitionsCreate}>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDialog("cancel")}>Cancel request</Button>
              </Can>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Requested items" />
          <DataTable caption="Requested items" columns={columns} rows={requisition.items} rowKey={(row) => row.productId} />
        </Card>
        <Card>
          <CardHeader title="Details" />
          <CardContent>
            <DetailList
              columns={2}
              items={[
                { label: "Purpose", value: requisition.purpose, wide: true },
                { label: "Department", value: requisition.department },
                { label: "Requested by", value: requisition.requestedBy },
                { label: "Created", value: formatDateTime(requisition.createdAt) },
                { label: "Last updated", value: formatDateTime(requisition.updatedAt) },
                { label: "Remarks", value: requisition.remarks, wide: true },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      {dialog === "issue" && <IssueDialog requisition={requisition} onClose={() => setDialog(null)} />}
      <Modal
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title="Reject requisition?"
        description="The requester will see your reason."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isLoading}>Cancel</Button>
            <Button variant="danger" loading={isLoading} onClick={() => (reason.trim() ? change("rejected", reason) : setReasonError("Give a reason for rejecting the request."))}>Reject</Button>
          </>
        }
      >
        <label htmlFor="reject-reason" className="text-sm font-medium">Reason <span className="text-red-600">*</span></label>
        <Textarea id="reject-reason" className="mt-1.5" rows={3} value={reason} aria-invalid={reasonError ? true : undefined} onChange={(event) => { setReason(event.target.value); setReasonError(""); }} />
        {reasonError && <p role="alert" className="mt-1 text-xs text-red-600">{reasonError}</p>}
      </Modal>
      <ConfirmDialog
        open={dialog === "cancel"}
        title="Cancel requisition?"
        description={`${requisition.reqNumber} will be cancelled and no supplies will be issued.`}
        confirmLabel="Cancel requisition"
        loading={isLoading}
        onConfirm={() => change("cancelled")}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

export function RequisitionDetailView({ id }: { id: string }) {
  const query = useGetRequisitionQuery(id);
  useBreadcrumbLabel(id, query.data?.reqNumber);
  return <QueryBoundary {...query}>{(requisition) => <RequisitionDetail requisition={requisition} />}</QueryBoundary>;
}
