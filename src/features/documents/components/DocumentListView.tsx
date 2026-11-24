"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, FileText, Layers, Plus, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Unauthorized } from "@/components/common/Unauthorized";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { getDocumentDef, type DocumentDef } from "@/config/documents";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useListState } from "@/hooks/useListState";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { useGetDocumentsQuery } from "@/services/api/endpoints/documentsApi";
import type { TransactionDocument } from "@/types/records";

type Tab = "all" | "draft" | "pending" | "posted" | "rejected" | "cancelled";

function DocumentList({ def }: { def: DocumentDef }) {
  useBreadcrumbLabel(def.key, def.title);
  const router = useRouter();
  const list = useListState({ sortBy: "date", sortOrder: "desc" });
  const { data, isLoading, isFetching, error, refetch } = useGetDocumentsQuery({ type: def.key, params: list.params });
  const { data: all } = useGetDocumentsQuery({ type: def.key, params: { pageSize: 200 } });
  const docs = all?.data ?? [];
  const count = (status: string) => docs.filter((doc) => doc.status === status).length;
  const tab = (list.filters.status || "all") as Tab;
  const listFields = def.fields.filter((field) => field.list).slice(0, 3);

  const columns: Column<TransactionDocument>[] = [
    { key: "number", header: `${def.prefix} No.`, sortable: true, cell: (doc) => <span className="font-mono text-xs font-semibold text-brand-700">{doc.number}</span> },
    { key: "date", header: "Date", sortable: true, cell: (doc) => formatDate(doc.date) },
    ...listFields.map((field) => ({
      key: field.name,
      header: field.label,
      hideOnMobile: true,
      cell: (doc: TransactionDocument) => doc.labels?.[field.name] ?? String(doc.fields[field.name] ?? "—"),
    })),
    {
      key: "totalQuantity",
      header: def.itemMode === "property" ? "Items" : "Total Qty",
      align: "right",
      cell: (doc) => (def.itemMode === "property" ? doc.items.length : formatNumber(doc.totalQuantity ?? 0)),
    },
    ...(def.itemMode !== "count"
      ? [{ key: "totalAmount", header: "Amount", align: "right" as const, hideOnMobile: true, cell: (doc: TransactionDocument) => formatCurrency(doc.totalAmount ?? 0) }]
      : []),
    {
      key: "step",
      header: "Current Step",
      hideOnMobile: true,
      cell: (doc) => {
        const pending = doc.approvals.find((step) => step.status === "pending");
        return <span className="text-xs text-muted">{pending ? `For ${pending.role}` : doc.status === "posted" ? "Completed" : "—"}</span>;
      },
    },
    { key: "status", header: "Status", sortable: true, cell: (doc) => <StatusBadge status={doc.status} /> },
  ];

  return (
    <>
      <PageHeader
        icon={FileText}
        title={def.title}
        description={def.formName ? `${def.description} Form: ${def.formName}.` : def.description}
        actions={
          <Can permission={def.createPermission}>
            <ButtonLink href={`/documents/${def.key}/new`} leftIcon={<Plus className="h-4 w-4" />}>
              New {def.singular}
            </ButtonLink>
          </Can>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Total ${def.title}`} value={docs.length} icon={Layers} loading={!all} />
        <StatCard label="Pending Approval" value={count("pending")} icon={Clock} accent="amber" loading={!all} />
        <StatCard label="Posted / Completed" value={count("posted")} icon={CheckCircle2} accent="emerald" loading={!all} />
        <StatCard label="Returned / Cancelled" value={count("rejected") + count("cancelled")} icon={XCircle} accent="rose" loading={!all} />
      </div>
      <Card>
        <Tabs
          label="Document status"
          className="px-3"
          value={tab}
          onChange={(value) => list.setFilter("status", value === "all" ? "" : value)}
          items={[
            { value: "all", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "pending", label: "Pending", count: count("pending") },
            { value: "posted", label: "Posted" },
            { value: "rejected", label: "Returned" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <TableToolbar showReset={Boolean(list.search || list.filters.from || list.filters.to)} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder={`Search ${def.prefix} no., warehouse, person…`} label={`Search ${def.title}`} />
          <label className="flex items-center gap-2 text-sm text-muted">
            From
            <Input type="date" value={list.filters.from ?? ""} onChange={(event) => list.setFilter("from", event.target.value)} className="w-40" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            To
            <Input type="date" value={list.filters.to ?? ""} onChange={(event) => list.setFilter("to", event.target.value)} className="w-40" />
          </label>
        </TableToolbar>
        <DataTable
          caption={def.title}
          columns={columns}
          rows={data?.data}
          rowKey={(doc) => doc.id}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={refetch}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onSort={list.toggleSort}
          meta={data?.meta}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          onRowClick={(doc) => router.push(`/documents/${def.key}/${doc.id}`)}
        />
      </Card>
    </>
  );
}

export function DocumentListView({ type }: { type: string }) {
  const def = getDocumentDef(type);
  if (!def) return <Unauthorized />;
  return <DocumentList key={def.key} def={def} />;
}
