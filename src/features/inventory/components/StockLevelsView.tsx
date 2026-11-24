"use client";

import { Boxes as BoxesIcon } from "lucide-react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { STOCK_STATUS_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { useAppSelector } from "@/lib/redux/hooks";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useGetStockLevelsQuery } from "@/services/api/endpoints/inventoryApi";
import { selectWarehouseId } from "@/store/features/appContextSlice";
import type { StockLevel } from "@/types/models";

function StockLevels() {
  const router = useRouter();
  const warehouseId = useAppSelector(selectWarehouseId);
  const list = useListState({ sortBy: "productName", filters: { stockStatus: useSearchParams().get("stockStatus") ?? "" } });
  const { data, isLoading, isFetching, error, refetch } = useGetStockLevelsQuery({ ...list.params, warehouseId: warehouseId || undefined });
  const { data: categories } = useGetCategoriesQuery();

  const columns: Column<StockLevel>[] = [
    { key: "productName", header: "Product", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.productName}</p>
        <p className="font-mono text-xs text-muted">{row.sku}</p>
      </div>
    ) },
    { key: "warehouseName", header: "Warehouse", sortable: true, cell: (row) => row.warehouseName },
    { key: "categoryName", header: "Category", hideOnMobile: true, cell: (row) => row.categoryName },
    { key: "quantity", header: "On hand", sortable: true, align: "right", cell: (row) => <span className="font-semibold">{formatNumber(row.quantity)} <span className="font-normal text-muted">{row.unit}</span></span> },
    { key: "reorderLevel", header: "Reorder at", align: "right", hideOnMobile: true, cell: (row) => row.reorderLevel },
    { key: "value", header: "Value", sortable: true, align: "right", cell: (row) => formatCurrency(row.value ?? 0) },
    { key: "stockStatus", header: "Status", cell: (row) => <StatusBadge status={row.stockStatus} /> },
    { key: "updatedAt", header: "Updated", sortable: true, hideOnMobile: true, cell: (row) => <span className="text-xs text-muted">{formatDateTime(row.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        icon={BoxesIcon}
        title="Stock levels"
        description={warehouseId ? "Quantities in the selected warehouse." : "Quantities per product in every warehouse. Use the warehouse selector in the header to focus on one."}
        actions={
          <Can permission={PERMISSIONS.inventoryAdjust}>
            <ButtonLink href="/inventory/transfer" variant="outline" leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Transfer</ButtonLink>
            <ButtonLink href="/inventory/adjust" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>Adjust stock</ButtonLink>
          </Can>
        }
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search product, SKU or warehouse" label="Search stock" />
          <FilterSelect
            label="Category"
            value={list.filters.categoryId ?? ""}
            onChange={(value) => list.setFilter("categoryId", value)}
            options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
          />
          <FilterSelect label="Stock" value={list.filters.stockStatus ?? ""} onChange={(value) => list.setFilter("stockStatus", value)} options={STOCK_STATUS_OPTIONS} className="w-full sm:w-40" />
        </TableToolbar>
        <DataTable
          caption="Stock levels"
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
        />
      </Card>
    </>
  );
}

export function StockLevelsView() {
  return (
    <Suspense>
      <StockLevels />
    </Suspense>
  );
}
