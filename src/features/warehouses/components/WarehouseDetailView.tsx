"use client";

import { useRouter } from "next/navigation";
import { Pencil, Warehouse as WarehouseIcon } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { STOCK_STATUS_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useListState } from "@/hooks/useListState";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useGetStockLevelsQuery } from "@/services/api/endpoints/inventoryApi";
import { useGetWarehouseQuery } from "@/services/api/endpoints/warehousesApi";
import type { StockLevel, Warehouse } from "@/types/models";

function WarehouseDetail({ warehouse }: { warehouse: Warehouse }) {
  const router = useRouter();
  const list = useListState({ sortBy: "productName" });
  const stock = useGetStockLevelsQuery({ ...list.params, warehouseId: warehouse.id });

  const columns: Column<StockLevel>[] = [
    { key: "productName", header: "Product", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.productName}</p>
        <p className="font-mono text-xs text-muted">{row.sku}</p>
      </div>
    ) },
    { key: "categoryName", header: "Category", sortable: true, hideOnMobile: true, cell: (row) => row.categoryName },
    { key: "quantity", header: "On hand", sortable: true, align: "right", cell: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
    { key: "value", header: "Value", sortable: true, align: "right", cell: (row) => formatCurrency(row.value ?? 0) },
    { key: "stockStatus", header: "Status", cell: (row) => <StatusBadge status={row.stockStatus} /> },
  ];

  return (
    <>
      <ProfileHeader
        name={warehouse.name}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900"><WarehouseIcon className="h-7 w-7" /></span>}
        subtitle={`${warehouse.code} · ${warehouse.address}`}
        badges={<><StatusBadge status={warehouse.type} /><StatusBadge status={warehouse.status} /></>}
        meta={[
          { label: "Manager", value: warehouse.manager },
          { label: "Items stocked", value: warehouse.itemCount ?? 0 },
          { label: "Total units", value: formatNumber(warehouse.totalUnits ?? 0) },
          { label: "Stock value", value: formatCurrency(warehouse.stockValue ?? 0) },
        ]}
        actions={
          <Can permission={PERMISSIONS.warehousesManage}>
            <ButtonLink href={`/warehouses/${warehouse.id}/edit`} variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
          </Can>
        }
      />
      <Card>
        <CardHeader title="Stock in this warehouse" description={warehouse.phone ? `Contact: ${warehouse.phone}` : undefined} />
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search product or SKU" label="Search stock" />
          <FilterSelect label="Stock" value={list.filters.stockStatus ?? ""} onChange={(value) => list.setFilter("stockStatus", value)} options={STOCK_STATUS_OPTIONS} />
        </TableToolbar>
        <DataTable
          caption={`Stock at ${warehouse.name}`}
          columns={columns}
          rows={stock.data?.data}
          rowKey={(row) => row.id}
          loading={stock.isLoading}
          fetching={stock.isFetching}
          error={stock.error}
          onRetry={stock.refetch}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onSort={list.toggleSort}
          meta={stock.data?.meta}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          onRowClick={(row) => router.push(`/products/${row.productId}`)}
        />
      </Card>
    </>
  );
}

export function WarehouseDetailView({ id }: { id: string }) {
  const query = useGetWarehouseQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(warehouse) => <WarehouseDetail warehouse={warehouse} />}</QueryBoundary>;
}
