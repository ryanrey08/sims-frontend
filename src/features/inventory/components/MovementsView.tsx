"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MOVEMENT_TYPE_OPTIONS } from "@/constants/options";
import { INBOUND_TYPES } from "@/constants/status";
import { useListState } from "@/hooks/useListState";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { exportToCsv } from "@/lib/utils/csv";
import { formatDateTime } from "@/lib/utils/format";
import { useGetMovementsQuery, useLazyGetMovementsQuery } from "@/services/api/endpoints/inventoryApi";
import { selectWarehouseId } from "@/store/features/appContextSlice";
import type { StockMovement } from "@/types/models";

function sourceLink(row: StockMovement) {
  if (row.sourceType === "purchase-order" && row.sourceId) return `/purchase-orders/${row.sourceId}`;
  if (row.sourceType === "requisition" && row.sourceId) return `/requisitions/${row.sourceId}`;
  return null;
}

function Movements() {
  const toast = useToast();
  const warehouseId = useAppSelector(selectWarehouseId);
  const list = useListState({ sortBy: "createdAt", sortOrder: "desc", filters: { productId: useSearchParams().get("productId") ?? "" } });
  const params = { ...list.params, warehouseId: warehouseId || undefined };
  const { data, isLoading, isFetching, error, refetch } = useGetMovementsQuery(params);
  const [fetchAll, { isFetching: exporting }] = useLazyGetMovementsQuery();

  const columns: Column<StockMovement>[] = [
    { key: "createdAt", header: "Date", sortable: true, cell: (row) => <span className="whitespace-nowrap text-xs">{formatDateTime(row.createdAt)}</span> },
    { key: "reference", header: "Reference", sortable: true, cell: (row) => {
      const href = sourceLink(row);
      return href ? <Link href={href} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{row.reference}</Link> : <span className="font-mono text-xs">{row.reference}</span>;
    } },
    { key: "productName", header: "Product", sortable: true, cell: (row) => (
      <Link href={`/products/${row.productId}`} className="hover:underline">
        <span className="block font-medium">{row.productName}</span>
        <span className="font-mono text-xs text-muted">{row.sku}</span>
      </Link>
    ) },
    { key: "type", header: "Type", sortable: true, cell: (row) => <StatusBadge status={row.type} /> },
    { key: "warehouseName", header: "Warehouse", hideOnMobile: true, cell: (row) => row.warehouseName },
    { key: "quantity", header: "Qty", align: "right", cell: (row) => {
      const inbound = (INBOUND_TYPES as readonly string[]).includes(row.type);
      return <span className={inbound ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{inbound ? "+" : "−"}{row.quantity} {row.unit}</span>;
    } },
    { key: "balanceAfter", header: "Balance", align: "right", hideOnMobile: true, cell: (row) => row.balanceAfter },
    { key: "reason", header: "Reason / by", hideOnMobile: true, cell: (row) => (
      <div className="max-w-56">
        <p className="truncate text-sm">{row.reason}</p>
        <p className="text-xs text-muted">{row.performedBy}</p>
      </div>
    ) },
  ];

  const onExport = async () => {
    try {
      const result = await fetchAll({ ...params, page: 1, pageSize: 200 }).unwrap();
      exportToCsv("stock-movements", result.data, [
        { header: "Date", value: (row) => row.createdAt },
        { header: "Reference", value: (row) => row.reference },
        { header: "Type", value: (row) => row.type },
        { header: "SKU", value: (row) => row.sku },
        { header: "Product", value: (row) => row.productName },
        { header: "Warehouse", value: (row) => row.warehouseName },
        { header: "Quantity", value: (row) => ((INBOUND_TYPES as readonly string[]).includes(row.type) ? row.quantity : -row.quantity) },
        { header: "Balance after", value: (row) => row.balanceAfter },
        { header: "Reason", value: (row) => row.reason },
        { header: "Performed by", value: (row) => row.performedBy },
      ]);
      toast.success("Export ready", `${result.data.length} movements exported${result.meta.total > 200 ? " (first 200; narrow the filters for more)" : ""}.`);
    } catch (exportError) {
      toast.error("Export failed", exportError);
    }
  };

  return (
    <>
      <PageHeader
        title="Stock movements"
        description="Audit trail of every receipt, issue, adjustment and transfer."
        actions={<Button variant="outline" onClick={onExport} loading={exporting} leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button>}
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search reference, product or reason" label="Search movements" />
          <FilterSelect label="Type" value={list.filters.type ?? ""} onChange={(value) => list.setFilter("type", value)} options={MOVEMENT_TYPE_OPTIONS} />
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
          caption="Stock movements"
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
          mobileTitleKey="productName"
        />
      </Card>
    </>
  );
}

export function MovementsView() {
  return (
    <Suspense>
      <Movements />
    </Suspense>
  );
}
