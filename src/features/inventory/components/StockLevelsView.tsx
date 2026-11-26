"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Box, ChevronDown, ClipboardCheck, Coins, Eye, FileBarChart, Minus, Pencil, Plus, TriangleAlert, XCircle } from "lucide-react";
import { Boxes as BoxesIcon } from "lucide-react";
import { LineChartView } from "@/components/charts";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { STOCK_STATUS_OPTIONS, categoryTone } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useGetStockLevelsQuery, useGetStockSummaryQuery } from "@/services/api/endpoints/inventoryApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { StockLevel } from "@/types/models";
import { StockNavTabs } from "./StockNavTabs";

/** "Stock Management" screen (mockup p14). */
function StockManagement() {
  const router = useRouter();
  const list = useListState({ sortBy: "sku", filters: { stockStatus: useSearchParams().get("stockStatus") ?? "" } });
  const [view, setView] = useState<"list" | "grid">("list");
  const { data, isLoading, isFetching, error, refetch } = useGetStockLevelsQuery(list.params);
  const { data: summary } = useGetStockSummaryQuery({ warehouseId: list.filters.warehouseId || undefined });
  const { data: categories } = useGetCategoriesQuery();
  const { data: warehouses } = useGetWarehousesQuery({ pageSize: 100 });

  const columns: Column<StockLevel>[] = [
    { key: "sku", header: "Item Code", sortable: true, cell: (row) => <span className="whitespace-nowrap font-semibold">{row.sku}</span> },
    { key: "productName", header: "Item Description", sortable: true, cell: (row) => row.productName },
    { key: "categoryName", header: "Category", hideOnMobile: true, cell: (row) => <Badge tone={categoryTone(row.categoryName)}>{row.categoryName}</Badge> },
    { key: "unit", header: "UoM", hideOnMobile: true, cell: (row) => row.unit },
    { key: "warehouseCode", header: "Warehouse", hideOnMobile: true, cell: (row) => row.warehouseCode?.replace(/^WH-/, "") ?? row.warehouseName },
    { key: "quantity", header: "On Hand", sortable: true, align: "right", cell: (row) => formatNumber(row.quantity) },
    { key: "reserved", header: "Reserved", align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reserved ?? 0) },
    { key: "available", header: "Available", align: "right", cell: (row) => <b>{formatNumber(row.available ?? row.quantity)}</b> },
    { key: "reorderLevel", header: "Reorder Level", align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reorderLevel ?? 0) },
    { key: "stockStatus", header: "Status", cell: (row) => <StatusBadge status={row.stockStatus} /> },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      hideOnMobile: true,
      cell: (row) => (
        <RowActions
          label={row.productName ?? row.sku ?? "item"}
          actions={[
            { label: "Adjust stock", icon: Pencil, inline: true, onSelect: () => router.push(`/documents/stock-adjustments/new?warehouseId=${row.warehouseId}`) },
            { label: "View item", icon: Eye, onSelect: () => router.push(`/products/${row.productId}`) },
            { label: "Transfer stock", icon: ArrowLeftRight, onSelect: () => router.push(`/documents/stock-transfers/new?fromWarehouseId=${row.warehouseId}`) },
            { label: "Stock card", icon: FileBarChart, onSelect: () => router.push(`/forms/stock-card?productId=${row.productId}&warehouseId=${row.warehouseId}`) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={BoxesIcon}
        title="Stock Management"
        description="Monitor inventory levels, stock movements, and replenishment across warehouses."
        actions={
          <>
            <Can permission={PERMISSIONS.inventoryAdjust}>
              <Dropdown
                align="right"
                trigger={(props) => (
                  <Button {...props} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Stock (Adjustment) <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                )}
              >
                {(close) => (
                  <>
                    <DropdownItem onClick={() => { close(); router.push("/documents/stock-adjustments/new?adjustmentType=Stock In (Add)"); }}>
                      <Plus className="h-4 w-4 text-[#1f9d55]" /> Stock In (Add)
                    </DropdownItem>
                    <DropdownItem onClick={() => { close(); router.push("/documents/stock-adjustments/new?adjustmentType=Stock Out (Deduct)"); }}>
                      <Minus className="h-4 w-4 text-red-600" /> Stock Out (Deduct)
                    </DropdownItem>
                  </>
                )}
              </Dropdown>
              <ButtonLink href="/documents/stock-transfers/new" variant="outline" leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Stock Transfer</ButtonLink>
              <ButtonLink href="/documents/physical-counts/new" variant="outline" leftIcon={<ClipboardCheck className="h-4 w-4" />}>Stock Count</ButtonLink>
            </Can>
            <ButtonLink href="/forms" variant="outline" leftIcon={<FileBarChart className="h-4 w-4" />}>Reports</ButtonLink>
          </>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_1.3fr]">
        <StatCard label="Total Stock Items" value={formatNumber(summary?.totalItems ?? 0)} icon={Box} accent="blue" loading={!summary} />
        <StatCard label="Total Stock Value" value={formatCurrency(summary?.totalValue ?? 0)} icon={Coins} accent="green" loading={!summary} />
        <StatCard label="Items Below Reorder" value={formatNumber(summary?.belowReorder ?? 0)} icon={TriangleAlert} accent="yellow" loading={!summary} />
        <StatCard label="Out of Stock" value={formatNumber(summary?.outOfStock ?? 0)} icon={XCircle} accent="pink" loading={!summary} />
        <div className="rounded-lg border border-line bg-white px-3 pb-1 pt-2.5 sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-bold text-ink">Stock Value Trend (Last 6 Months)</p>
          <LineChartView data={summary?.valueTrend ?? []} series={[{ key: "value", label: "Stock value" }]} height={92} />
        </div>
      </div>
      <div className="mb-4">
        <StockNavTabs />
      </div>
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters} view={view} onViewChange={setView}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search item (code, description, barcode)..." label="Search stock" />
          <FilterSelect layout="inline" label="Warehouse" allLabel="All Warehouses" value={list.filters.warehouseId ?? ""} onChange={(value) => list.setFilter("warehouseId", value)} options={(warehouses?.data ?? []).map((item) => ({ label: item.code, value: item.id }))} />
          <FilterSelect layout="inline" label="Item Category" allLabel="All Categories" value={list.filters.categoryId ?? ""} onChange={(value) => list.setFilter("categoryId", value)} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
          <FilterSelect layout="inline" label="Stock Status" value={list.filters.stockStatus ?? ""} onChange={(value) => list.setFilter("stockStatus", value)} options={STOCK_STATUS_OPTIONS} />
        </TableToolbar>
        {view === "grid" ? (
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.data ?? []).map((row) => (
              <button key={row.id} type="button" onClick={() => router.push(`/products/${row.productId}`)} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4 text-left text-[13px] hover:border-brand-300">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{row.sku}</span>
                  <StatusBadge status={row.stockStatus} />
                </div>
                <span>{row.productName}</span>
                <Badge tone={categoryTone(row.categoryName)}>{row.categoryName}</Badge>
                <span className="text-slate-600">{row.warehouseCode} · On hand <b>{formatNumber(row.quantity)}</b> · Available <b>{formatNumber(row.available ?? row.quantity)}</b></span>
              </button>
            ))}
          </div>
        ) : (
          <DataTable
            caption="Stock management"
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
            onRowClick={(row) => router.push(`/products/${row.productId}`)}
            mobileTitleKey="productName"
          />
        )}
      </Card>
    </>
  );
}

export function StockLevelsView() {
  return (
    <Suspense>
      <StockManagement />
    </Suspense>
  );
}
