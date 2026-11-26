"use client";

import { BarChart3 as BarChart3Icon } from "lucide-react";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/States";
import { BarChartView, LineChartView, PieChartView } from "@/components/charts";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { INBOUND_TYPES } from "@/constants/status";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatDateTime, formatNumber, todayISO } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useGetMovementReportQuery, useGetPurchasingReportQuery, useGetValuationReportQuery, type ReportFilters } from "@/services/api/endpoints/reportsApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Scale, ShoppingCart, Receipt } from "lucide-react";
import type { PurchaseOrder, StockLevel, StockMovement } from "@/types/models";

type ReportTab = "valuation" | "movements" | "purchasing";

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function ChartBlock({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return loading ? <Skeleton className="h-[280px]" /> : <>{children}</>;
}

function ValuationReport({ filters }: { filters: ReportFilters }) {
  const toast = useToast();
  const { data, isLoading, isFetching, error, refetch } = useGetValuationReportQuery(filters);
  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  const columns: Column<StockLevel>[] = [
    { key: "productName", header: "Product", cell: (row) => <span className="font-medium">{row.productName}</span> },
    { key: "warehouseName", header: "Warehouse", cell: (row) => row.warehouseName },
    { key: "categoryName", header: "Category", hideOnMobile: true, cell: (row) => row.categoryName },
    { key: "quantity", header: "Qty", align: "right", cell: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
    { key: "unitCost", header: "Unit cost", align: "right", cell: (row) => formatCurrency(row.unitCost ?? 0) },
    { key: "value", header: "Value", align: "right", cell: (row) => <span className="font-semibold">{formatCurrency(row.value ?? 0)}</span> },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total inventory value" value={formatCurrency(data?.totalValue ?? 0)} icon={Wallet} loading={isLoading} />
        <StatCard label="Units on hand" value={formatNumber(data?.totalUnits ?? 0)} icon={Scale} accent="amber" loading={isLoading} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Value by category" /><CardContent><ChartBlock loading={!data}>{data && <BarChartView data={data.byCategory} series={[{ key: "value", label: "Value (₱)" }]} layout="vertical" height={300} />}</ChartBlock></CardContent></Card>
        <Card><CardHeader title="Value by warehouse" /><CardContent><ChartBlock loading={!data}>{data && <PieChartView data={data.byWarehouse} height={300} />}</ChartBlock></CardContent></Card>
      </div>
      <Card>
        <CardHeader
          title="Valuation detail"
          description={`${data?.rows.length ?? 0} stock lines`}
          actions={
            <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled={!data} onClick={() => {
              if (!data) return;
              exportToCsv(`inventory-valuation-${todayISO()}`, data.rows, [
                { header: "SKU", value: (row) => row.sku },
                { header: "Product", value: (row) => row.productName },
                { header: "Category", value: (row) => row.categoryName },
                { header: "Warehouse", value: (row) => row.warehouseName },
                { header: "Quantity", value: (row) => row.quantity },
                { header: "Unit", value: (row) => row.unit },
                { header: "Unit cost", value: (row) => row.unitCost },
                { header: "Value", value: (row) => row.value },
              ]);
              toast.success("Report exported", "Inventory valuation CSV downloaded.");
            }}>Export CSV</Button>
          }
        />
        <DataTable caption="Valuation detail" columns={columns} rows={data?.rows.slice(0, 50)} rowKey={(row) => row.id} loading={isLoading} fetching={isFetching} />
        {data && data.rows.length > 50 && <p className="border-t border-line px-5 py-3 text-xs text-muted">Showing the 50 highest-value lines. Export CSV for all {data.rows.length}.</p>}
      </Card>
    </div>
  );
}

function MovementReport({ filters }: { filters: ReportFilters }) {
  const toast = useToast();
  const { data, isLoading, isFetching, error, refetch } = useGetMovementReportQuery(filters);
  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  const columns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", cell: (row) => <span className="text-xs">{formatDateTime(row.createdAt)}</span> },
    { key: "reference", header: "Reference", cell: (row) => <span className="font-mono text-xs">{row.reference}</span> },
    { key: "productName", header: "Product", cell: (row) => row.productName },
    { key: "type", header: "Type", cell: (row) => <StatusBadge status={row.type} /> },
    { key: "warehouseName", header: "Warehouse", hideOnMobile: true, cell: (row) => row.warehouseName },
    { key: "quantity", header: "Qty", align: "right", cell: (row) => {
      const inbound = (INBOUND_TYPES as readonly string[]).includes(row.type);
      return <span className={inbound ? "text-emerald-700" : "text-red-600"}>{inbound ? "+" : "−"}{row.quantity}</span>;
    } },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Units in" value={formatNumber(data?.totals.inbound ?? 0)} icon={ArrowDownToLine} accent="emerald" loading={isLoading} />
        <StatCard label="Units out" value={formatNumber(data?.totals.outbound ?? 0)} icon={ArrowUpFromLine} accent="rose" loading={isLoading} />
        <StatCard label="Net change" value={formatNumber(data?.totals.net ?? 0)} icon={Scale} loading={isLoading} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader title="Daily flow" /><CardContent><ChartBlock loading={!data}>{data && <BarChartView data={data.daily} series={[{ key: "inbound", label: "Inbound" }, { key: "outbound", label: "Outbound" }]} />}</ChartBlock></CardContent></Card>
        <Card><CardHeader title="By movement type" /><CardContent><ChartBlock loading={!data}>{data && <PieChartView data={data.byType.filter((point) => Number(point.value) > 0)} />}</ChartBlock></CardContent></Card>
      </div>
      <Card>
        <CardHeader
          title="Movement detail"
          description={`${data?.rows.length ?? 0} movements`}
          actions={
            <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled={!data} onClick={() => {
              if (!data) return;
              exportToCsv(`stock-movements-${todayISO()}`, data.rows, [
                { header: "Date", value: (row) => row.createdAt },
                { header: "Reference", value: (row) => row.reference },
                { header: "Type", value: (row) => row.type },
                { header: "Product", value: (row) => row.productName },
                { header: "Warehouse", value: (row) => row.warehouseName },
                { header: "Quantity", value: (row) => ((INBOUND_TYPES as readonly string[]).includes(row.type) ? row.quantity : -row.quantity) },
                { header: "Reason", value: (row) => row.reason },
              ]);
              toast.success("Report exported", "Stock movement CSV downloaded.");
            }}>Export CSV</Button>
          }
        />
        <DataTable caption="Movement detail" columns={columns} rows={data?.rows.slice(0, 50)} rowKey={(row) => row.id} loading={isLoading} fetching={isFetching} mobileTitleKey="productName" />
      </Card>
    </div>
  );
}

function PurchasingReport({ filters }: { filters: ReportFilters }) {
  const toast = useToast();
  const { data, isLoading, isFetching, error, refetch } = useGetPurchasingReportQuery(filters);
  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  const columns: Column<PurchaseOrder>[] = [
    { key: "poNumber", header: "PO number", cell: (row) => <span className="font-mono text-xs font-semibold">{row.poNumber}</span> },
    { key: "supplierName", header: "Supplier", cell: (row) => row.supplierName },
    { key: "orderDate", header: "Ordered", cell: (row) => formatDate(row.orderDate) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "total", header: "Total", align: "right", cell: (row) => formatCurrency(row.total ?? 0) },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Committed spend" value={formatCurrency(data?.totalSpend ?? 0)} hint="Excludes drafts and cancelled orders" icon={Receipt} loading={isLoading} />
        <StatCard label="Purchase orders" value={data?.orderCount ?? 0} icon={ShoppingCart} accent="purple" loading={isLoading} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Spend by supplier" /><CardContent><ChartBlock loading={!data}>{data && <BarChartView data={data.bySupplier} series={[{ key: "value", label: "Spend (₱)" }]} layout="vertical" height={300} />}</ChartBlock></CardContent></Card>
        <Card><CardHeader title="Monthly spend" /><CardContent><ChartBlock loading={!data}>{data && <LineChartView data={data.byMonth} series={[{ key: "spend", label: "Spend (₱)" }]} height={300} />}</ChartBlock></CardContent></Card>
      </div>
      <Card>
        <CardHeader
          title="Purchase orders"
          actions={
            <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled={!data} onClick={() => {
              if (!data) return;
              exportToCsv(`purchasing-${todayISO()}`, data.rows, [
                { header: "PO number", value: (row) => row.poNumber },
                { header: "Supplier", value: (row) => row.supplierName },
                { header: "Order date", value: (row) => row.orderDate },
                { header: "Expected", value: (row) => row.expectedDate },
                { header: "Status", value: (row) => row.status },
                { header: "Total", value: (row) => row.total },
              ]);
              toast.success("Report exported", "Purchasing CSV downloaded.");
            }}>Export CSV</Button>
          }
        />
        <DataTable caption="Purchase orders" columns={columns} rows={data?.rows} rowKey={(row) => row.id} loading={isLoading} fetching={isFetching} />
      </Card>
    </div>
  );
}

export function ReportsView() {
  const [tab, setTab] = useState<ReportTab>("valuation");
  const [draft, setDraft] = useState<ReportFilters>({ from: daysAgoISO(30), to: todayISO() });
  // Filters are applied explicitly with "Generate" so typing a date doesn't fire a request per keystroke.
  const [filters, setFilters] = useState<ReportFilters>(draft);
  const { data: warehouses } = useGetWarehousesQuery();
  const { data: categories } = useGetCategoriesQuery();
  const { data: suppliers } = useGetSuppliersQuery({ pageSize: 100, sortBy: "name" });
  const update = (key: keyof ReportFilters, value: string) => setDraft((current) => ({ ...current, [key]: value || undefined }));

  return (
    <>
      <PageHeader
        icon={BarChart3Icon}
        title="Reports"
        description="Valuation, stock movement and purchasing analytics. Export any report to CSV."
        actions={<Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>}
      />
      <Card className="mb-6">
        <Tabs
          label="Report type"
          className="px-3"
          value={tab}
          onChange={setTab}
          items={[
            { value: "valuation", label: "Inventory valuation" },
            { value: "movements", label: "Stock movement" },
            { value: "purchasing", label: "Purchasing" },
          ]}
        />
        <form
          className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(draft);
          }}
        >
          {tab !== "purchasing" && (
            <>
              <div>
                <label htmlFor="report-warehouse" className="mb-1.5 block text-sm font-medium">Warehouse</label>
                <Select id="report-warehouse" placeholder="All warehouses" value={draft.warehouseId ?? ""} onChange={(event) => update("warehouseId", event.target.value)} options={(warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
              </div>
              <div>
                <label htmlFor="report-category" className="mb-1.5 block text-sm font-medium">Category</label>
                <Select id="report-category" placeholder="All categories" value={draft.categoryId ?? ""} onChange={(event) => update("categoryId", event.target.value)} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
              </div>
            </>
          )}
          {tab === "purchasing" && (
            <div className="lg:col-span-2">
              <label htmlFor="report-supplier" className="mb-1.5 block text-sm font-medium">Supplier</label>
              <Select id="report-supplier" placeholder="All suppliers" value={draft.supplierId ?? ""} onChange={(event) => update("supplierId", event.target.value)} options={(suppliers?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
            </div>
          )}
          {tab !== "valuation" ? (
            <>
              <div>
                <label htmlFor="report-from" className="mb-1.5 block text-sm font-medium">From</label>
                <Input id="report-from" type="date" value={draft.from ?? ""} onChange={(event) => update("from", event.target.value)} />
              </div>
              <div>
                <label htmlFor="report-to" className="mb-1.5 block text-sm font-medium">To</label>
                <Input id="report-to" type="date" value={draft.to ?? ""} onChange={(event) => update("to", event.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted lg:col-span-2">Valuation reflects current stock at today&apos;s unit costs.</p>
          )}
          <Button type="submit">Generate report</Button>
        </form>
      </Card>
      {tab === "valuation" && <ValuationReport filters={{ warehouseId: filters.warehouseId, categoryId: filters.categoryId }} />}
      {tab === "movements" && <MovementReport filters={{ warehouseId: filters.warehouseId, categoryId: filters.categoryId, from: filters.from, to: filters.to }} />}
      {tab === "purchasing" && <PurchasingReport filters={{ supplierId: filters.supplierId, from: filters.from, to: filters.to }} />}
    </>
  );
}
