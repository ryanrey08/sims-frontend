"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Ban, ClipboardList, Download, Eye, FileText, Landmark, PackagePlus, Plus, RotateCcw, Search, Send, Trash2, Wrench } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormBlock } from "@/components/forms/HField";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { PROPERTY_CATEGORIES } from "@/config/masterData";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { useGetDocumentsQuery } from "@/services/api/endpoints/documentsApi";
import { useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import type { TransactionDocument } from "@/types/records";
import { Attachments } from "@/features/documents/components/Attachments";
import { PropertyFormModal } from "./PropertyFormModal";
import { KeyValues, SimplePager, cell, head } from "./shared";

export type TxType = "Acquisition" | "Issuance" | "Transfer" | "Return" | "Repair / Maintenance" | "Disposal" | "Write-off";

export const TX_TYPES: { type: TxType; icon: typeof Landmark; tone: BadgeTone }[] = [
  { type: "Acquisition", icon: PackagePlus, tone: "success" },
  { type: "Issuance", icon: Send, tone: "info" },
  { type: "Transfer", icon: ArrowLeftRight, tone: "purple" },
  { type: "Return", icon: RotateCcw, tone: "neutral" },
  { type: "Repair / Maintenance", icon: Wrench, tone: "warning" },
  { type: "Disposal", icon: Trash2, tone: "orange" },
  { type: "Write-off", icon: Ban, tone: "danger" },
];

export interface PropertyTx {
  id: string;
  number: string;
  type: TxType;
  date: string;
  propertyNo: string;
  description: string;
  category: string;
  department: string;
  fromDepartment?: string;
  toDepartment?: string;
  issuedTo?: string;
  quantity: number;
  remarks: string;
  status: string;
  href: string;
  doc?: TransactionDocument;
}

const DOC_STATUS: Record<string, string> = { posted: "completed", pending: "pending", draft: "draft", rejected: "rejected", cancelled: "cancelled", approved: "approved" };

/** Unified property transaction feed built from property documents, acquisitions and work orders. */
export function usePropertyTransactions() {
  const properties = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });
  const workOrders = useGetMasterRecordsQuery({ resource: "work-orders", params: { pageSize: 500 } });
  const assignments = useGetDocumentsQuery({ type: "property-assignments", params: { pageSize: 500 } });
  const transfers = useGetDocumentsQuery({ type: "property-transfers", params: { pageSize: 500 } });
  const returns = useGetDocumentsQuery({ type: "property-returns", params: { pageSize: 500 } });
  const disposals = useGetDocumentsQuery({ type: "property-disposals", params: { pageSize: 500 } });
  const loading = [properties, workOrders, assignments, transfers, returns, disposals].some((query) => query.isLoading);

  const rows = useMemo(() => {
    const byId = new Map((properties.data?.data ?? []).map((record) => [record.id, record]));
    const fromDoc = (doc: TransactionDocument, type: TxType): PropertyTx => {
      const first = byId.get(doc.items[0]?.refId ?? "");
      return {
        id: doc.id,
        number: doc.number,
        type,
        date: doc.date,
        propertyNo: String(doc.items[0]?.code ?? "—"),
        description: doc.items.length > 1 ? `${doc.items[0]?.description} +${doc.items.length - 1} more` : (doc.items[0]?.description ?? "—"),
        category: String(first?.category ?? ""),
        department: String(first?.department ?? "—"),
        fromDepartment: doc.labels?.fromEmployeeId ?? doc.labels?.employeeId,
        toDepartment: doc.labels?.toEmployeeId,
        issuedTo: doc.labels?.employeeId ?? doc.labels?.toEmployeeId,
        quantity: doc.items.length,
        remarks: doc.remarks ?? "",
        status: DOC_STATUS[doc.status] ?? doc.status,
        href: `/documents/${doc.type}/${doc.id}`,
        doc,
      };
    };
    const list: PropertyTx[] = [
      ...(properties.data?.data ?? []).map((record) => ({
        id: `acq-${record.id}`,
        number: `ACQ-${String(record.acquisitionDate ?? "").slice(0, 4)}-${String(record.propertyNo).replace(/\D/g, "").slice(-5)}`,
        type: "Acquisition" as const,
        date: String(record.acquisitionDate ?? ""),
        propertyNo: String(record.propertyNo),
        description: String(record.description),
        category: String(record.category ?? ""),
        department: String(record.department ?? "—"),
        issuedTo: record.accountableId__label ? String(record.accountableId__label) : undefined,
        quantity: 1,
        remarks: `Acquired from ${String(record.supplierName ?? "supplier")} (${String(record.poNo ?? "no PO")}).`,
        status: "completed",
        href: `/property?focus=${record.id}`,
      })),
      ...(assignments.data?.data ?? []).map((doc) => fromDoc(doc, "Issuance")),
      ...(transfers.data?.data ?? []).map((doc) => fromDoc(doc, "Transfer")),
      ...(returns.data?.data ?? []).map((doc) => fromDoc(doc, "Return")),
      ...(disposals.data?.data ?? []).map((doc) => fromDoc(doc, String(doc.fields.disposalType ?? "").startsWith("Lost") ? "Write-off" : "Disposal")),
      ...(workOrders.data?.data ?? []).map((record) => {
        const property = byId.get(String(record.propertyId));
        return {
          id: record.id,
          number: String(record.woNo ?? record.requestNo),
          type: "Repair / Maintenance" as const,
          date: String(record.requestDate ?? ""),
          propertyNo: String(property?.propertyNo ?? "—"),
          description: String(property?.description ?? record.issue),
          category: String(property?.category ?? ""),
          department: String(record.department ?? "—"),
          quantity: 1,
          remarks: String(record.issue ?? ""),
          status: record.status === "completed" ? "completed" : record.status === "pending" ? "pending" : "in-progress",
          href: `/property/maintenance/${record.id}`,
        };
      }),
    ];
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [properties.data, workOrders.data, assignments.data, transfers.data, returns.data, disposals.data]);

  return { rows, loading, properties: properties.data?.data ?? [] };
}

export function TxTypePill({ type }: { type: TxType }) {
  const meta = TX_TYPES.find((item) => item.type === type) ?? TX_TYPES[0];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <span className="flex items-center gap-1 whitespace-nowrap"><Icon className="h-3 w-3" />{type}</span>
    </Badge>
  );
}

/** Where "New Property Transaction" sends each type (forms for each transaction). */
export function newTransactionHref(type: TxType) {
  switch (type) {
    case "Issuance":
      return "/documents/property-assignments/new";
    case "Transfer":
      return "/documents/property-transfers/new";
    case "Return":
      return "/documents/property-returns/new";
    case "Repair / Maintenance":
      return "/property/maintenance?new=1";
    case "Disposal":
      return "/documents/property-disposals/new";
    case "Write-off":
      return "/documents/property-disposals/new?disposalType=Lost / Stolen";
    default:
      return null;
  }
}

/** Type selector modal (p55–p61): pick the transaction type, then continue to its form. */
export function NewPropertyTransactionModal({ open, onClose, onAcquisition }: { open: boolean; onClose: () => void; onAcquisition: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<TxType>("Acquisition");
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      variant="brand"
      icon={<ClipboardList className="h-5 w-5" />}
      title="New Property Transaction"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onClose();
              const href = newTransactionHref(type);
              if (href) router.push(href);
              else onAcquisition();
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-slate-600">Select the transaction type.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Transaction type">
        {TX_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.type} type="button" role="radio" aria-checked={type === item.type} onClick={() => setType(item.type)} className={cn("flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-[13px] font-semibold", type === item.type ? "border-[#2f6fd6] bg-[#eaf2fe] text-[#2f6fd6]" : "border-line hover:bg-slate-50")}>
              <Icon className="h-6 w-6" />
              {item.type}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/** "Property Transactions" screen (p54). */
function PropertyTransactions() {
  const router = useRouter();
  const toast = useToast();
  const initialSearch = useSearchParams().get("property") ?? "";
  const { rows: all, loading } = usePropertyTransactions();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState(initialSearch);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [acquisition, setAcquisition] = useState(false);

  const rows = all.filter(
    (row) =>
      (tab === "all" || row.type === tab) &&
      (!filters.type || row.type === filters.type) &&
      (!filters.category || row.category === filters.category) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.from || row.date >= filters.from) &&
      (!filters.to || row.date <= filters.to) &&
      (!search || `${row.number} ${row.propertyNo} ${row.description}`.toLowerCase().includes(search.toLowerCase())),
  );
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const focus = rows.find((row) => row.id === focusId) ?? pageRows[0];
  const count = (type: TxType) => all.filter((row) => row.type === type).length;

  return (
    <>
      <PageHeader icon={ArrowLeftRight} title="Property Transactions" description="Record and track all property-related transactions (acquisition, issuance, transfer, return, repair, disposal, and write-off)." />
      <StatGrid columns={6}>
        <StatCard label="Total Transactions" value={formatNumber(all.length)} icon={FileText} accent="blue" loading={loading} />
        <StatCard label="Acquisition" value={formatNumber(count("Acquisition"))} icon={PackagePlus} accent="green" loading={loading} />
        <StatCard label="Issuance" value={formatNumber(count("Issuance"))} icon={Send} accent="sky" loading={loading} />
        <StatCard label="Transfer" value={formatNumber(count("Transfer"))} icon={ArrowLeftRight} accent="purple" loading={loading} />
        <StatCard label="Repair / Maintenance" value={formatNumber(count("Repair / Maintenance"))} icon={Wrench} accent="yellow" loading={loading} />
        <StatCard label="Disposal" value={formatNumber(count("Disposal") + count("Write-off"))} icon={Trash2} accent="pink" loading={loading} />
      </StatGrid>
      <Card className="mb-4">
        <Tabs
          label="Transaction types"
          className="px-4"
          value={tab}
          onChange={(value) => { setTab(value); setPage(1); }}
          items={[{ value: "all", label: "All Transactions", icon: FileText }, ...TX_TYPES.map((item) => ({ value: item.type, label: item.type, icon: item.icon }))]}
        />
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Date From<Input type="date" value={draft.from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} className="w-40" /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Date To<Input type="date" value={draft.to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} className="w-40" /></label>
          <FilterSelect layout="stacked" label="Transaction Type" allLabel="All Types" value={draft.type ?? ""} onChange={(value) => setDraft((current) => ({ ...current, type: value }))} options={TX_TYPES.map((item) => ({ label: item.type, value: item.type }))} />
          <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.category ?? ""} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} options={PROPERTY_CATEGORIES.map((value) => ({ label: value, value }))} />
          <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={[{ label: "Completed", value: "completed" }, { label: "In Progress", value: "in-progress" }, { label: "For Approval", value: "pending" }, { label: "Draft", value: "draft" }]} />
          <div className="flex min-w-56 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-slate-700">Search</span>
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by transaction no., property no..." label="Search transactions" />
          </div>
          <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => { setFilters(draft); setPage(1); }}>Search</Button>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[2.2fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-[15px] font-bold">Transaction List ({formatNumber(rows.length)})</h2>
            <div className="flex gap-2">
              <Can permission={PERMISSIONS.propertyManage}>
                <Button size="sm" onClick={() => setNewOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>New Transaction</Button>
              </Can>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => {
                  exportToCsv("property-transactions", rows, [
                    { header: "Transaction No.", value: (row) => row.number },
                    { header: "Type", value: (row) => row.type },
                    { header: "Date", value: (row) => row.date },
                    { header: "Property No.", value: (row) => row.propertyNo },
                    { header: "Description", value: (row) => row.description },
                    { header: "Department", value: (row) => row.department },
                    { header: "Status", value: (row) => row.status },
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
              <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Transaction No.</th><th className={cell}>Transaction Type</th><th className={cell}>Trans. Date</th><th className={cell}>Property No. / Description</th><th className={cell}>Department</th><th className={cell}>Status</th><th className={cn(cell, "text-center")}>Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((row, index) => (
                  <tr key={row.id} onClick={() => setFocusId(row.id)} className={cn("cursor-pointer", focus?.id === row.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
                    <td className={cn(cell, "text-slate-500")}>{(page - 1) * 10 + index + 1}</td>
                    <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6] underline underline-offset-2")}>{row.number}</td>
                    <td className={cell}><TxTypePill type={row.type} /></td>
                    <td className={cn(cell, "whitespace-nowrap")}>{formatDate(row.date)}</td>
                    <td className={cell}><span className="block whitespace-nowrap font-semibold">{row.propertyNo}</span><span className="line-clamp-1 text-slate-600">{row.description}</span></td>
                    <td className={cell}>{row.department}</td>
                    <td className={cell}><StatusBadge status={row.status} /></td>
                    <td className={cn(cell, "text-center")}>
                      <button type="button" aria-label={`Open ${row.number}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); router.push(row.href); }}><Eye className="h-4 w-4" /></button>
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
              <div className="mb-3 flex items-center justify-between gap-2"><TxTypePill type={focus.type} /><StatusBadge status={focus.status} /></div>
              <KeyValues
                rows={[
                  ["Transaction No.", <span key="n" className="text-[#2f6fd6]">{focus.number}</span>],
                  ["Transaction Date", formatDate(focus.date)],
                  ["Property No.", focus.propertyNo],
                  ["Description", focus.description],
                  ["Department (From)", focus.fromDepartment ?? focus.department],
                  ["Department (To)", focus.toDepartment ?? "—"],
                  ["Issued To", focus.issuedTo ?? "—"],
                  ["Quantity", focus.quantity],
                  ["Remarks", focus.remarks || "—"],
                ]}
              />
              <p className="mb-2 mt-4 text-[13px] font-bold">Supporting Documents</p>
              <Attachments value={focus.doc?.attachments ?? []} readOnly />
              <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push(focus.href)} leftIcon={<Eye className="h-4 w-4" />}>Open Transaction</Button>
            </>
          ) : (
            <p className="text-[13px] text-slate-500">Select a transaction to see its details.</p>
          )}
        </FormBlock>
      </div>
      <NewPropertyTransactionModal open={newOpen} onClose={() => setNewOpen(false)} onAcquisition={() => setAcquisition(true)} />
      <PropertyFormModal open={acquisition} onClose={() => setAcquisition(false)} onSaved={(record) => { setAcquisition(false); toast.success("Property acquired", `${String(record.propertyNo)} was recorded.`); }} />
    </>
  );
}

export function PropertyTransactionsView() {
  return (
    <Suspense>
      <PropertyTransactions />
    </Suspense>
  );
}

