"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CheckCircle2, ChevronDown, Clock, Download, Eye, FileText, History, PackageX, Plus, Search, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { FormBlock } from "@/components/forms/HField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { getDocumentDef } from "@/config/documents";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useGetDocumentsQuery } from "@/services/api/endpoints/documentsApi";
import { useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import type { TransactionDocument } from "@/types/records";
import { DocStatus } from "@/features/documents/components/parts";
import { KeyValues, SimplePager, cell, head } from "./shared";

type Tab = "all" | "transfer" | "disposal" | "queue" | "history";
const transferDef = getDocumentDef("property-transfers")!;
const disposalDef = getDocumentDef("property-disposals")!;
const defOf = (doc: TransactionDocument) => (doc.type === "property-transfers" ? transferDef : disposalDef);

/** "Disposal / Transfer" screen (p79): transfers and disposals of property in one place. */
export function DisposalTransferView() {
  const router = useRouter();
  const toast = useToast();
  const transfers = useGetDocumentsQuery({ type: "property-transfers", params: { pageSize: 500, sortBy: "date", sortOrder: "desc" } });
  const disposals = useGetDocumentsQuery({ type: "property-disposals", params: { pageSize: 500, sortBy: "date", sortOrder: "desc" } });
  const { data: properties } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const loading = transfers.isLoading || disposals.isLoading;

  const all = useMemo(() => [...(transfers.data?.data ?? []), ...(disposals.data?.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [transfers.data, disposals.data]);
  const isTransfer = (doc: TransactionDocument) => doc.type === "property-transfers";
  const scoped = all.filter((doc) => (tab === "transfer" ? isTransfer(doc) : tab === "disposal" ? !isTransfer(doc) : tab === "queue" ? doc.status === "pending" : true));
  const rows = scoped.filter(
    (doc) =>
      (!filters.type || (filters.type === "transfer") === isTransfer(doc)) &&
      (!filters.status || doc.status === filters.status) &&
      (!filters.from || doc.date >= filters.from) &&
      (!filters.to || doc.date <= filters.to) &&
      (!search || `${doc.number} ${doc.items.map((item) => `${item.code} ${item.description}`).join(" ")}`.toLowerCase().includes(search.toLowerCase())),
  );
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const focus = rows.find((doc) => doc.id === focusId) ?? pageRows[0];
  const forDisposal = (properties?.data ?? []).filter((record) => record.status === "for-disposal" || (record.condition === "Unserviceable" && !["disposed", "lost"].includes(String(record.status)))).length;
  const history = all
    .flatMap((doc) => doc.approvals.filter((step) => step.status === "approved" || step.status === "rejected").map((step) => ({ doc, step })))
    .sort((a, b) => String(b.step.at).localeCompare(String(a.step.at)));
  const from = (doc: TransactionDocument) => (isTransfer(doc) ? (doc.labels?.fromEmployeeId ?? "—") : "Property Office");
  const to = (doc: TransactionDocument) => (isTransfer(doc) ? (doc.labels?.toEmployeeId ?? "—") : String(doc.fields.disposalType ?? "—"));

  return (
    <>
      <PageHeader icon={ArrowLeftRight} title="Disposal / Transfer" description="Process and track the transfer or disposal of property, equipment, and other assets." />
      <StatGrid columns={5}>
        <StatCard label="Transfer Requests" value={formatNumber(transfers.data?.data.length ?? 0)} icon={ArrowLeftRight} accent="blue" loading={loading} />
        <StatCard label="Transfers Completed" value={formatNumber((transfers.data?.data ?? []).filter((doc) => doc.status === "posted").length)} icon={CheckCircle2} accent="green" loading={loading} />
        <StatCard label="Disposal Requests" value={formatNumber(disposals.data?.data.length ?? 0)} icon={Clock} accent="yellow" loading={loading} />
        <StatCard label="Disposed" value={formatNumber((disposals.data?.data ?? []).filter((doc) => doc.status === "posted").length)} icon={Trash2} accent="pink" loading={loading} />
        <StatCard label="Assets for Disposal" value={formatNumber(forDisposal)} icon={PackageX} accent="purple" loading={!properties} />
      </StatGrid>
      <Card className="mb-4">
        <Tabs
          label="Disposal and transfer views"
          className="px-4"
          value={tab}
          onChange={(value) => { setTab(value); setPage(1); }}
          items={[
            { value: "all", label: "Transactions", icon: FileText },
            { value: "transfer", label: "Transfer Requests", icon: ArrowLeftRight },
            { value: "disposal", label: "Disposal Requests", icon: Trash2 },
            { value: "queue", label: "Approval Queue", icon: Clock, count: all.filter((doc) => doc.status === "pending").length },
            { value: "history", label: "History / Audit Log", icon: History },
          ]}
        />
        {tab !== "history" && (
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-end">
            <FilterSelect layout="stacked" label="Transaction Type" allLabel="All (Transfer & Disposal)" value={draft.type ?? ""} onChange={(value) => setDraft((current) => ({ ...current, type: value }))} options={[{ label: "Transfer", value: "transfer" }, { label: "Disposal", value: "disposal" }]} />
            <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={[{ label: "Draft", value: "draft" }, { label: "For Approval", value: "pending" }, { label: "Completed", value: "posted" }, { label: "Returned", value: "rejected" }]} />
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Date From<Input type="date" className="w-40" value={draft.from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Date To<Input type="date" className="w-40" value={draft.to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></label>
            <div className="flex min-w-56 flex-1 flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">Search</span>
              <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search reference no., property no. or description..." label="Search transactions" />
            </div>
            <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => { setFilters(draft); setPage(1); }}>Search</Button>
          </div>
        )}
      </Card>
      {tab === "history" ? (
        <Card className="overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className={head}><th className={cell}>Date &amp; Time</th><th className={cell}>Reference No.</th><th className={cell}>Type</th><th className={cell}>Action</th><th className={cell}>By</th><th className={cell}>Remarks</th></tr></thead>
            <tbody className="divide-y divide-line">
              {history.slice(0, 50).map(({ doc, step }, index) => (
                <tr key={index}>
                  <td className={cn(cell, "whitespace-nowrap")}>{formatDateTime(step.at)}</td>
                  <td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{doc.number}</td>
                  <td className={cell}><Badge tone={isTransfer(doc) ? "info" : "orange"}>{isTransfer(doc) ? "Transfer" : "Disposal"}</Badge></td>
                  <td className={cell}>{step.status === "approved" ? "Approved" : "Returned"} – {step.role}</td>
                  <td className={cell}>{step.by ?? "—"}</td>
                  <td className={cell}>{step.remarks ?? "—"}</td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No approvals recorded yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[2.2fr_1fr]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <h2 className="text-[15px] font-bold">Disposal / Transfer Transactions ({formatNumber(rows.length)})</h2>
              <div className="flex gap-2">
                <Can permission={PERMISSIONS.propertyManage}>
                  <Dropdown trigger={(props) => <Button {...props} size="sm" leftIcon={<Plus className="h-4 w-4" />}>New Transaction <ChevronDown className="ml-1 h-4 w-4" /></Button>}>
                    {(close) => (
                      <>
                        <DropdownItem onClick={() => { close(); router.push("/documents/property-transfers/new"); }}><ArrowLeftRight className="h-4 w-4" /> Transfer</DropdownItem>
                        <DropdownItem onClick={() => { close(); router.push("/documents/property-disposals/new"); }}><Trash2 className="h-4 w-4" /> Disposal</DropdownItem>
                      </>
                    )}
                  </Dropdown>
                </Can>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => {
                    exportToCsv("disposal-transfer", rows, [
                      { header: "Reference No.", value: (doc) => doc.number },
                      { header: "Type", value: (doc) => (isTransfer(doc) ? "Transfer" : "Disposal") },
                      { header: "Date", value: (doc) => doc.date },
                      { header: "From", value: from },
                      { header: "To / Disposal Method", value: to },
                      { header: "Items", value: (doc) => doc.items.length },
                      { header: "Status", value: (doc) => doc.status },
                    ]);
                    toast.success("Export ready", `${rows.length} transactions exported.`);
                  }}
                >
                  Export (Excel)
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Reference No.</th><th className={cell}>Transaction Type</th><th className={cell}>Date</th><th className={cell}>From</th><th className={cell}>To / Disposal Method</th><th className={cell}>Status</th><th className={cn(cell, "text-center")}>Actions</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((doc, index) => (
                    <tr key={doc.id} onClick={() => setFocusId(doc.id)} className={cn("cursor-pointer", focus?.id === doc.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
                      <td className={cn(cell, "text-slate-500")}>{(page - 1) * 10 + index + 1}</td>
                      <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6] underline underline-offset-2")}>{doc.number}</td>
                      <td className={cell}><Badge tone={isTransfer(doc) ? "info" : "orange"}>{isTransfer(doc) ? "Transfer" : "Disposal"}</Badge></td>
                      <td className={cn(cell, "whitespace-nowrap")}>{formatDate(doc.date)}</td>
                      <td className={cell}>{from(doc)}</td>
                      <td className={cell}>{to(doc)}</td>
                      <td className={cell}><DocStatus def={defOf(doc)} doc={doc} /></td>
                      <td className={cn(cell, "text-center")}>
                        <button type="button" aria-label={`Open ${doc.number}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); router.push(`/documents/${doc.type}/${doc.id}`); }}><Eye className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{loading ? "Loading…" : "No transactions match the filters."}</td></tr>}
                </tbody>
              </table>
            </div>
            <SimplePager page={page} total={rows.length} onPage={setPage} />
          </Card>
          <FormBlock title="Transaction Details" icon={FileText}>
            {focus ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Badge tone={isTransfer(focus) ? "info" : "orange"}>{isTransfer(focus) ? "Transfer" : "Disposal"}</Badge><b className="text-[#2f6fd6]">{focus.number}</b></span>
                  <DocStatus def={defOf(focus)} doc={focus} />
                </div>
                <KeyValues
                  rows={[
                    ["Date", formatDate(focus.date)],
                    ["From", from(focus)],
                    [isTransfer(focus) ? "To" : "Disposal Method", to(focus)],
                    [isTransfer(focus) ? "Reason" : "Inspected By", String(focus.fields.reason ?? focus.fields.inspectedBy ?? "—")],
                    ["Prepared By", focus.createdBy],
                    ["Total Book Value", formatCurrency(focus.totalAmount ?? 0)],
                  ]}
                />
                <p className="mb-1 mt-4 text-[13px] font-bold">Items ({focus.items.length})</p>
                <table className="w-full text-[12px]">
                  <thead><tr className={head}><th className="px-2 py-1.5">Property No.</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5 text-right">Value</th></tr></thead>
                  <tbody className="divide-y divide-line">{focus.items.map((item) => <tr key={item.refId}><td className="px-2 py-1.5 font-semibold text-[#2f6fd6]">{item.code}</td><td className="px-2 py-1.5">{item.description}</td><td className="px-2 py-1.5 text-right">{formatCurrency(item.unitCost ?? 0)}</td></tr>)}</tbody>
                </table>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push(`/documents/${focus.type}/${focus.id}`)} leftIcon={<Eye className="h-4 w-4" />}>Open Transaction</Button>
              </>
            ) : (
              <p className="text-[13px] text-slate-500">Select a transaction to see its details.</p>
            )}
          </FormBlock>
        </div>
      )}
    </>
  );
}
