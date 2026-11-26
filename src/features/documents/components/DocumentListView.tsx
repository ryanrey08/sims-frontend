"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ArrowRight, ClipboardList, Download, Eye, FileText, PackageCheck, Pencil, Plus, Printer, Search, Share2, SlidersHorizontal } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { Unauthorized } from "@/components/common/Unauthorized";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { displayStatus, getDocumentDef, type DocumentDef } from "@/config/documents";
import { STATUS_META } from "@/constants/status";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useListState } from "@/hooks/useListState";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { useGetDocumentsQuery } from "@/services/api/endpoints/documentsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { TransactionDocument } from "@/types/records";
import { DocLink, DocStatus, PersonCell, TypePill, WarehouseCell } from "./parts";

const MODULE_ICONS = { warehouse: ArrowLeftRight, transactions: FileText, property: ClipboardList };

function isThisMonth(date: string) {
  const now = new Date();
  const value = new Date(date);
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
}

function DocumentList({ def }: { def: DocumentDef }) {
  useBreadcrumbLabel(def.key, def.ui.title);
  const router = useRouter();
  const toast = useToast();
  const { ui } = def;
  const list = useListState({ sortBy: "date", sortOrder: "desc" });
  const [view, setView] = useState<"list" | "grid">("list");
  const { data, isLoading, isFetching, error, refetch } = useGetDocumentsQuery({ type: def.key, params: list.params });
  const { data: all } = useGetDocumentsQuery({ type: def.key, params: { pageSize: 500 } });
  const { data: warehouseData } = useGetWarehousesQuery({ pageSize: 100 });
  const warehouses = useMemo(() => new Map((warehouseData?.data ?? []).map((item) => [item.id, item])), [warehouseData]);
  const docs = all?.data ?? [];
  const typeField = ui.typeField ? def.fields.find((field) => field.name === ui.typeField) : undefined;
  const personField = def.fields.find((field) => field.name === "requestedBy" && field.group !== "side");
  const stacked = ui.filterStyle === "stacked";

  // Labels-above filter bars apply on "Search", like the mockup.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const applyDraft = () => Object.entries(draft).forEach(([key, value]) => list.setFilter(key, value));

  const cardValue = (card: DocumentDef["ui"]["cards"][number]) =>
    docs.filter((doc) => {
      if (card.thisMonth) return isThisMonth(doc.date);
      if (card.typePrefix && ui.typeField) return String(doc.fields[ui.typeField] ?? "").startsWith(card.typePrefix);
      return !card.statuses || card.statuses.includes(displayStatus(def, doc));
    }).length;

  const statusOptions = [
    "draft",
    "pending",
    ...(def.key === "stock-transfers" ? ["in-transit"] : []),
    ui.postedLabel ?? "posted",
    "rejected",
    "cancelled",
  ].map((value) => ({ label: STATUS_META[value]?.label ?? value, value }));

  const href = (doc: TransactionDocument) => `/documents/${def.key}/${doc.id}`;
  const fieldText = (doc: TransactionDocument, name: string) => doc.labels?.[name] ?? (doc.fields[name] === null || doc.fields[name] === undefined ? "" : String(doc.fields[name]));

  const listColumns: Column<TransactionDocument>[] = ui.listColumns.flatMap((column, position) => {
    const cell = (doc: TransactionDocument) => {
      if (column.kind === "warehouse") return <WarehouseCell warehouse={warehouses.get(String(doc.fields[column.field]))} fallback={fieldText(doc, column.field)} />;
      if (column.kind === "person") return <PersonCell name={fieldText(doc, column.field)} />;
      if (column.kind === "type") return <TypePill value={fieldText(doc, column.field)} />;
      if (column.kind === "date") return <span className="whitespace-nowrap">{formatDate(fieldText(doc, column.field))}</span>;
      const text = fieldText(doc, column.field) || "—";
      return text.length > 28 ? <span className="line-clamp-2 min-w-40 max-w-56">{text}</span> : <span className="whitespace-nowrap">{text}</span>;
    };
    const entry: Column<TransactionDocument> = { key: column.field, header: column.label, hideOnMobile: position > 0, cell };
    // From → To warehouse pairs get the arrow column shown in the mockup.
    if (column.kind === "warehouse" && ui.listColumns[position + 1]?.kind === "warehouse") {
      return [entry, { key: `${column.field}-arrow`, header: "", hideOnMobile: true, cell: () => <ArrowRight className="h-4 w-4 text-slate-400" aria-label="to" /> }];
    }
    return [entry];
  });

  const actions = (doc: TransactionDocument) => {
    const editable = doc.status === "draft" || doc.status === "rejected";
    return (
      <RowActions
        label={doc.number}
        actions={[
          { label: "View", icon: Eye, inline: true, onSelect: () => router.push(href(doc)) },
          { label: "Edit", icon: Pencil, inline: true, onSelect: () => router.push(`${href(doc)}/edit`), hidden: !editable },
          { label: "Print", icon: Printer, inline: !editable, onSelect: () => router.push(`${href(doc)}?print=1`) },
          { label: "Share link", icon: Share2, onSelect: () => { void navigator.clipboard?.writeText(`${window.location.origin}${href(doc)}`); toast.success("Link copied", doc.number); } },
        ]}
      />
    );
  };

  const columns: Column<TransactionDocument>[] = [
    ...(stacked ? [{ key: "index", header: "#", cell: (doc: TransactionDocument) => <span className="text-slate-500">{((data?.meta.page ?? 1) - 1) * (data?.meta.pageSize ?? 10) + (data?.data.indexOf(doc) ?? 0) + 1}</span> }] : []),
    { key: "number", header: ui.numberLabel, sortable: true, cell: (doc) => <DocLink href={href(doc)}>{doc.number}</DocLink> },
    { key: "date", header: def.key === "stock-transfers" ? "Transfer Date" : "Date", sortable: true, cell: (doc) => <span className="whitespace-nowrap">{formatDate(doc.date)}</span> },
    ...listColumns,
    { key: "items", header: "No. of Items", align: "center", hideOnMobile: true, cell: (doc) => doc.items.length },
    ...(def.itemMode !== "property" ? [{ key: "totalQuantity", header: "Total Qty", align: "right" as const, hideOnMobile: true, cell: (doc: TransactionDocument) => formatNumber(doc.totalQuantity ?? 0) }] : []),
    ...(ui.showAmount ? [{ key: "totalAmount", header: "Total Amount", align: "right" as const, hideOnMobile: true, cell: (doc: TransactionDocument) => formatCurrency(doc.totalAmount ?? 0) }] : []),
    { key: "status", header: "Status", sortable: true, cell: (doc) => <DocStatus def={def} doc={doc} /> },
    { key: "person", header: personField ? "Requested By" : def.key === "issuances" ? "Issued By" : "Prepared By", hideOnMobile: true, cell: (doc) => <PersonCell name={personField ? fieldText(doc, personField.name) : doc.createdBy} /> },
    { key: "actions", header: "Actions", align: "center", hideOnMobile: true, cell: actions },
  ];

  const exportRows = () => {
    exportToCsv(def.key, docs, [
      { header: ui.numberLabel, value: (doc) => doc.number },
      { header: "Date", value: (doc) => doc.date },
      ...ui.listColumns.map((column) => ({ header: column.label, value: (doc: TransactionDocument) => fieldText(doc, column.field) })),
      { header: "No. of Items", value: (doc) => doc.items.length },
      { header: "Total Qty", value: (doc) => doc.totalQuantity },
      { header: "Total Amount", value: (doc) => doc.totalAmount },
      { header: "Status", value: (doc) => STATUS_META[displayStatus(def, doc)]?.label ?? doc.status },
    ]);
    toast.success("Export ready", `${docs.length} records exported.`);
  };

  const warehouseOptions = (warehouseData?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id }));
  const Icon = MODULE_ICONS[def.module];

  return (
    <>
      <PageHeader
        icon={def.key === "stock-adjustments" ? SlidersHorizontal : def.key === "receiving" ? PackageCheck : Icon}
        title={ui.titleNote ? <>{ui.title} <span className="font-normal">{ui.titleNote}</span></> : ui.title}
        description={ui.subtitle}
        actions={
          <>
            <Can permission={def.createPermission}>
              <ButtonLink href={`/documents/${def.key}/new`} leftIcon={<Plus className="h-4 w-4" />}>
                {ui.newLabel}
              </ButtonLink>
            </Can>
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportRows} disabled={!docs.length}>Export</Button>
            {!stacked && <Button variant="outline" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>}
          </>
        }
      />
      <StatGrid columns={Math.min(6, Math.max(3, ui.cards.length)) as 3 | 4 | 5 | 6}>
        {ui.cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={formatNumber(cardValue(card))} icon={card.icon} accent={card.accent} loading={!all} />
        ))}
      </StatGrid>
      <Card>
        {typeField && (
          <div className="px-4 pt-4">
            <Tabs
              variant="pill"
              label="Issuance type"
              value={list.filters[typeField.name] ?? ""}
              onChange={(value) => list.setFilter(typeField.name, value)}
              items={[
                { value: "", label: `All ${def.ui.title.split(" ")[0]}s`, icon: FileText },
                ...ui.cards.filter((card) => card.typePrefix).map((card) => ({ value: card.typePrefix as string, label: card.label, icon: card.icon })),
              ]}
            />
          </div>
        )}
        {stacked ? (
          <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex min-w-64 flex-1 flex-col gap-1">
              <span className="text-xs font-semibold text-slate-700">Search</span>
              <SearchInput value={list.search} onChange={list.setSearch} placeholder={`Search by ${ui.numberLabel.toLowerCase()}, reference, item, or department...`} label={`Search ${ui.title}`} />
            </div>
            {ui.warehouseField && (
              <FilterSelect layout="stacked" label="Warehouse" allLabel="All Warehouses" value={draft[ui.warehouseField] ?? list.filters[ui.warehouseField] ?? ""} onChange={(value) => setDraft((current) => ({ ...current, [ui.warehouseField as string]: value }))} options={warehouseOptions} />
            )}
            <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? list.filters.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={statusOptions} />
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Date From
              <Input type="date" value={draft.from ?? list.filters.from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} className="w-40" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
              Date To
              <Input type="date" value={draft.to ?? list.filters.to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} className="w-40" />
            </label>
            <Button leftIcon={<Search className="h-4 w-4" />} onClick={applyDraft}>Search</Button>
            {list.hasActiveFilters && (
              <Button variant="ghost" onClick={() => { setDraft({}); list.resetFilters(); }}>Reset</Button>
            )}
          </div>
        ) : (
          <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters} view={view} onViewChange={setView}>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={`Search ${def.singular} (ref no., item, warehouse)...`} label={`Search ${ui.title}`} />
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              Date From
              <Input type="date" value={list.filters.from ?? ""} onChange={(event) => list.setFilter("from", event.target.value)} className="w-36" />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
              Date To
              <Input type="date" value={list.filters.to ?? ""} onChange={(event) => list.setFilter("to", event.target.value)} className="w-36" />
            </label>
            <FilterSelect layout="inline" label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={statusOptions} />
          </TableToolbar>
        )}
        {view === "grid" && !stacked ? (
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3">
            {(data?.data ?? []).map((doc) => (
              <div key={doc.id} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4 text-[13px]">
                <div className="flex items-start justify-between gap-2">
                  <DocLink href={href(doc)}>{doc.number}</DocLink>
                  <DocStatus def={def} doc={doc} />
                </div>
                <p className="text-slate-600">{formatDate(doc.date)}</p>
                {ui.listColumns.slice(0, 2).map((column) => (
                  <p key={column.field}><span className="text-slate-500">{column.label}:</span> <b>{fieldText(doc, column.field) || "—"}</b></p>
                ))}
                <p className="text-slate-600">{doc.items.length} items · {formatNumber(doc.totalQuantity ?? 0)} qty</p>
                <div className="flex justify-end border-t border-line pt-2">{actions(doc)}</div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            caption={ui.title}
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
            onRowClick={(doc) => router.push(href(doc))}
          />
        )}
      </Card>
    </>
  );
}

export function DocumentListView({ type }: { type: string }) {
  const def = getDocumentDef(type);
  if (!def) return <Unauthorized />;
  return <DocumentList key={def.key} def={def} />;
}
