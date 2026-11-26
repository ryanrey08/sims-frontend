"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Box, ChevronDown, Coins, Download, FileSpreadsheet, History, ImageIcon, Printer, Search, ShieldCheck, TriangleAlert, Warehouse as WarehouseIcon, XCircle } from "lucide-react";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { FormBlock } from "@/components/forms/HField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Tabs } from "@/components/ui/Tabs";
import { ITEM_TYPE_OPTIONS, STOCK_STATUS_OPTIONS, categoryTone } from "@/constants/options";
import { STATUS_META } from "@/constants/status";
import { useListState } from "@/hooks/useListState";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useGetMovementsQuery, useGetStockSummaryQuery } from "@/services/api/endpoints/inventoryApi";
import { useGetProductStockQuery, useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { Product } from "@/types/models";
import { DocLink } from "@/features/documents/components/parts";

type DetailTab = "movement" | "warehouse" | "reservations" | "reorder" | "history";
const INBOUND = new Set(["receipt", "adjustment-in", "transfer-in"]);

/** "Stock Inquiry" screen (mockup p39). */
export function StockInquiryView() {
  const toast = useToast();
  const list = useListState({ sortBy: "sku" });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("movement");
  const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery(list.params);
  const { data: all } = useGetProductsQuery({ pageSize: 1000, warehouseId: list.filters.warehouseId || undefined });
  const { data: summary } = useGetStockSummaryQuery({ warehouseId: list.filters.warehouseId || undefined });
  const { data: categories } = useGetCategoriesQuery();
  const { data: warehouses } = useGetWarehousesQuery({ pageSize: 100 });
  const items = useMemo(() => all?.data ?? [], [all]);
  const selected = data?.data.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId) ?? data?.data[0];

  useEffect(() => {
    if (!selectedId && data?.data[0]) setSelectedId(data.data[0].id);
  }, [data, selectedId]);

  const available = (row: Product) => Math.max(0, (row.totalStock ?? 0) - (row.reservedStock ?? 0));
  const columns: Column<Product>[] = [
    { key: "index", header: "#", cell: (row) => <span className="text-slate-500">{((data?.meta.page ?? 1) - 1) * (data?.meta.pageSize ?? 10) + (data?.data.indexOf(row) ?? 0) + 1}</span> },
    { key: "sku", header: "Item Code", sortable: true, cell: (row) => <DocLink href={`/products/${row.id}`}>{row.sku}</DocLink> },
    { key: "name", header: "Item Description", sortable: true, cell: (row) => <span className="line-clamp-2 min-w-44">{row.name}</span> },
    { key: "categoryName", header: "Category", hideOnMobile: true, cell: (row) => <Badge tone={categoryTone(row.categoryName)}>{row.categoryName}</Badge> },
    { key: "unit", header: "UoM", hideOnMobile: true, cell: (row) => row.unit },
    { key: "totalStock", header: "On Hand", sortable: true, align: "right", cell: (row) => <span className="font-semibold text-[#1a7f46]">{formatNumber(row.totalStock ?? 0)}</span> },
    { key: "reservedStock", header: "Reserved", align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reservedStock ?? 0) },
    { key: "available", header: "Available", align: "right", cell: (row) => <b>{formatNumber(available(row))}</b> },
    { key: "reorderLevel", header: "Reorder Level", align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reorderLevel) },
    { key: "stockStatus", header: "Status", cell: (row) => <StatusBadge status={row.stockStatus} label={row.stockStatus === "in-stock" ? "In Stock" : undefined} /> },
  ];

  const exportRows = () => {
    exportToCsv("stock-inquiry", items, [
      { header: "Item Code", value: (row) => row.sku },
      { header: "Item Description", value: (row) => row.name },
      { header: "Category", value: (row) => row.categoryName },
      { header: "UoM", value: (row) => row.unit },
      { header: "On Hand", value: (row) => row.totalStock },
      { header: "Reserved", value: (row) => row.reservedStock },
      { header: "Available", value: (row) => available(row) },
      { header: "Reorder Level", value: (row) => row.reorderLevel },
      { header: "Status", value: (row) => STATUS_META[row.stockStatus ?? ""]?.label ?? "" },
    ]);
    toast.success("Export ready", `${items.length} items exported.`);
  };

  return (
    <>
      <PageHeader
        icon={Search}
        title="Stock Inquiry"
        description="View current stock balance, item details, stock movement, and availability by warehouse."
        actions={
          <>
            <Dropdown
              trigger={(props) => (
                <Button {...props} variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled={!items.length}>
                  Export <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              )}
            >
              {(close) => (
                <DropdownItem onClick={() => { close(); exportRows(); }}><FileSpreadsheet className="h-4 w-4" /> Excel (.csv)</DropdownItem>
              )}
            </Dropdown>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
          </>
        }
      />
      <StatGrid columns={5}>
        <StatCard label="Total Items" value={formatNumber(items.length)} icon={Box} accent="blue" loading={!all} />
        <StatCard label="Total On Hand" value={formatNumber(items.reduce((sum, item) => sum + (item.totalStock ?? 0), 0))} icon={ShieldCheck} accent="green" loading={!all} />
        <StatCard label="Below Reorder" value={formatNumber(items.filter((item) => item.stockStatus === "low-stock").length)} icon={TriangleAlert} accent="yellow" loading={!all} />
        <StatCard label="Out of Stock" value={formatNumber(items.filter((item) => item.stockStatus === "out-of-stock").length)} icon={XCircle} accent="pink" loading={!all} />
        <StatCard label="Total Stock Value" value={formatCurrency(summary?.totalValue ?? 0)} icon={Coins} accent="purple" loading={!summary} />
      </StatGrid>
      <Card className="mb-4">
        <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex min-w-64 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-slate-700">Search</span>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search by item code, description, barcode, or brand..." label="Search items" />
          </div>
          <FilterSelect layout="stacked" label="Warehouse" allLabel="All Warehouses" value={draft.warehouseId ?? list.filters.warehouseId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, warehouseId: value }))} options={(warehouses?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id }))} />
          <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.categoryId ?? list.filters.categoryId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
          <FilterSelect layout="stacked" label="Item Type" allLabel="All Types" value={draft.itemType ?? list.filters.itemType ?? ""} onChange={(value) => setDraft((current) => ({ ...current, itemType: value }))} options={ITEM_TYPE_OPTIONS} />
          <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.stockStatus ?? list.filters.stockStatus ?? ""} onChange={(value) => setDraft((current) => ({ ...current, stockStatus: value }))} options={STOCK_STATUS_OPTIONS.map((option) => (option.value === "in-stock" ? { ...option, label: "In Stock" } : option))} />
          <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => Object.entries(draft).forEach(([key, value]) => list.setFilter(key, value))}>Search</Button>
          {list.hasActiveFilters && <Button variant="ghost" onClick={() => { setDraft({}); list.resetFilters(); }}>Reset</Button>}
        </div>
        <DataTable
          caption="Stock inquiry"
          columns={columns}
          rows={data?.data}
          rowKey={(row) => row.id}
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
          onRowClick={(row) => setSelectedId(row.id)}
          mobileTitleKey="name"
        />
      </Card>
      {selected && (
        <div className="grid gap-4 xl:grid-cols-[1fr_2.2fr]">
          <FormBlock title="Item Details" icon={Box}>
            <div className="flex gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-slate-50">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-9 w-9 text-slate-300" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[#2f6fd6]">{selected.sku}</p>
                <p className="text-[13px] font-semibold">{selected.name}</p>
                <div className="mt-1.5"><StatusBadge status={selected.stockStatus} label={selected.stockStatus === "in-stock" ? "In Stock" : undefined} /></div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-[13px]">
              {[
                ["Category", selected.categoryName],
                ["Item Type", selected.itemType ?? "—"],
                ["UoM", selected.unit],
                ["Unit Cost", formatCurrency(selected.unitCost)],
                ["Unit Price", selected.unitPrice ? formatCurrency(selected.unitPrice) : "—"],
                ["Preferred Supplier", selected.supplierName ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </FormBlock>
          <Card>
            <Tabs
              label="Item information"
              className="px-4"
              value={tab}
              onChange={setTab}
              items={[
                { value: "movement", label: "Stock Movement" },
                { value: "warehouse", label: "Warehouse Stock" },
                { value: "reservations", label: "Reservations" },
                { value: "reorder", label: "Reorder Info" },
                { value: "history", label: "Item History" },
              ]}
            />
            <ItemTab tab={tab} product={selected} />
          </Card>
        </div>
      )}
    </>
  );
}

function ItemTab({ tab, product }: { tab: DetailTab; product: Product }) {
  const movements = useGetMovementsQuery({ productId: product.id, pageSize: tab === "history" ? 20 : 6, sortBy: "createdAt", sortOrder: "desc" });
  const stock = useGetProductStockQuery(product.id);
  const head = "bg-[#f3f4f6] text-left text-xs font-bold";
  const cell = "px-3 py-2.5";

  if (tab === "warehouse" || tab === "reservations") {
    const rows = (stock.data ?? []).filter((row) => tab === "warehouse" || (row.reserved ?? 0) > 0);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className={head}><th className={cell}>Warehouse</th><th className={cn(cell, "text-right")}>On Hand</th><th className={cn(cell, "text-right")}>Reserved</th><th className={cn(cell, "text-right")}>Available</th><th className={cell}>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={cell}><span className="flex items-center gap-2"><WarehouseIcon className="h-4 w-4 text-brand-600" /><b>{row.warehouseCode}</b> {row.warehouseName}</span></td>
                <td className={cn(cell, "text-right")}>{formatNumber(row.quantity)}</td>
                <td className={cn(cell, "text-right")}>{formatNumber(row.reserved ?? 0)}</td>
                <td className={cn(cell, "text-right font-bold")}>{formatNumber(row.available ?? row.quantity)}</td>
                <td className={cell}><StatusBadge status={row.stockStatus} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">{tab === "reservations" ? "No quantities are reserved by pending documents." : "No stock recorded."}</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }
  if (tab === "reorder") {
    const onHand = product.totalStock ?? 0;
    const below = onHand <= product.reorderLevel;
    return (
      <dl className="grid gap-3 p-4 text-[13px] sm:grid-cols-2">
        {[
          ["On Hand", formatNumber(onHand)],
          ["Reorder Level", formatNumber(product.reorderLevel)],
          ["Reorder Qty", formatNumber(product.reorderQuantity)],
          ["Minimum Stock", formatNumber(product.minStock ?? 0)],
          ["Maximum Stock", formatNumber(product.maxStock ?? 0)],
          ["Suggested Order Qty", below ? formatNumber(Math.max(product.reorderQuantity, (product.maxStock ?? 0) - onHand)) : "Not needed"],
          ["Preferred Supplier", product.supplierName ?? "—"],
          ["Reorder Status", below ? "For Reorder" : "Sufficient"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 rounded-md border border-line px-3 py-2">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  const rows = movements.data?.data ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className={head}>
            <th className={cell}>Date</th><th className={cell}>Reference No.</th><th className={cell}>Transaction Type</th><th className={cell}>Warehouse</th>
            <th className={cn(cell, "text-right")}>Qty In</th><th className={cn(cell, "text-right")}>Qty Out</th><th className={cn(cell, "text-right")}>Balance</th><th className={cell}>Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((movement) => (
            <tr key={movement.id}>
              <td className={cn(cell, "whitespace-nowrap")}>{tab === "history" ? formatDateTime(movement.createdAt) : formatDate(movement.createdAt)}</td>
              <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6]")}>{movement.reference}</td>
              <td className={cell}><span className="flex items-center gap-1.5">{INBOUND.has(movement.type) ? <ArrowDownLeft className="h-3.5 w-3.5 text-[#1f9d55]" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />}{STATUS_META[movement.type]?.label ?? movement.type}</span></td>
              <td className={cell}>{movement.warehouseName}</td>
              <td className={cn(cell, "text-right font-semibold text-[#1f9d55]")}>{INBOUND.has(movement.type) ? formatNumber(movement.quantity) : ""}</td>
              <td className={cn(cell, "text-right font-semibold text-red-600")}>{INBOUND.has(movement.type) ? "" : formatNumber(movement.quantity)}</td>
              <td className={cn(cell, "text-right")}>{formatNumber(movement.balanceAfter)}</td>
              <td className={cn(cell, "text-slate-600")}>{movement.reason}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">{movements.isLoading ? "Loading…" : "No movements recorded for this item."}</td></tr>}
        </tbody>
      </table>
      {tab === "history" && <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-xs text-slate-500"><History className="h-3.5 w-3.5" />Item created {formatDateTime(product.createdAt)} · last updated {formatDateTime(product.updatedAt)}</p>}
    </div>
  );
}
