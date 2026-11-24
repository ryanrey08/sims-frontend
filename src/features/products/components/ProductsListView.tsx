"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PRODUCT_STATUS_OPTIONS, STOCK_STATUS_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useDeleteProductMutation, useGetProductsQuery, useLazyGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { selectWarehouseId } from "@/store/features/appContextSlice";
import type { Product } from "@/types/models";

function ProductsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.productsManage);
  const warehouseId = useAppSelector(selectWarehouseId);
  const list = useListState({
    sortBy: "name",
    filters: { stockStatus: searchParams.get("stockStatus") ?? "", categoryId: searchParams.get("categoryId") ?? "" },
  });
  // The global warehouse context scopes stock totals.
  const params = { ...list.params, warehouseId: warehouseId || undefined };
  const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery(params);
  const { data: categories } = useGetCategoriesQuery();
  const [fetchAll, { isFetching: exporting }] = useLazyGetProductsQuery();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          <p className="font-mono text-xs text-muted">{row.sku}</p>
        </div>
      ),
    },
    { key: "categoryName", header: "Category", sortable: true, cell: (row) => row.categoryName },
    { key: "totalStock", header: "On hand", sortable: true, align: "right", cell: (row) => `${formatNumber(row.totalStock ?? 0)} ${row.unit}` },
    { key: "reorderLevel", header: "Reorder at", sortable: true, align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reorderLevel) },
    { key: "unitCost", header: "Unit cost", sortable: true, align: "right", hideOnMobile: true, cell: (row) => formatCurrency(row.unitCost) },
    { key: "stockValue", header: "Value", sortable: true, align: "right", cell: (row) => formatCurrency(row.stockValue ?? 0) },
    {
      key: "stockStatus",
      header: "Stock",
      cell: (row) => (row.status === "discontinued" ? <StatusBadge status="discontinued" /> : <StatusBadge status={row.stockStatus} />),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <RowActions
          label={row.name}
          actions={[
            { label: "View details", icon: Eye, onSelect: () => router.push(`/products/${row.id}`) },
            { label: "Edit", icon: Pencil, onSelect: () => router.push(`/products/${row.id}/edit`), hidden: !canManage },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  const onExport = async () => {
    try {
      const result = await fetchAll({ ...params, page: 1, pageSize: 200 }).unwrap();
      exportToCsv(`products-${new Date().toISOString().slice(0, 10)}`, result.data, [
        { header: "SKU", value: (row) => row.sku },
        { header: "Name", value: (row) => row.name },
        { header: "Category", value: (row) => row.categoryName },
        { header: "Unit", value: (row) => row.unit },
        { header: "Unit cost", value: (row) => row.unitCost },
        { header: "On hand", value: (row) => row.totalStock },
        { header: "Reorder level", value: (row) => row.reorderLevel },
        { header: "Stock value", value: (row) => row.stockValue },
        { header: "Stock status", value: (row) => row.stockStatus },
        { header: "Preferred supplier", value: (row) => row.supplierName },
        { header: "Status", value: (row) => row.status },
      ]);
      toast.success("Export ready", `${result.data.length} products exported to CSV.`);
    } catch (exportError) {
      toast.error("Export failed", exportError);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id).unwrap();
      toast.success("Product deleted", toDelete.name);
    } catch (deleteError) {
      toast.error("Could not delete product", deleteError);
    }
    setToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Catalog of supply items with live stock, value and reorder status."
        actions={
          <>
            <Button variant="outline" onClick={onExport} loading={exporting} leftIcon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Can permission={PERMISSIONS.productsManage}>
              <ButtonLink href="/products/new" leftIcon={<Plus className="h-4 w-4" />}>
                Add product
              </ButtonLink>
            </Can>
          </>
        }
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name, SKU or barcode" label="Search products" />
          <FilterSelect
            label="Category"
            value={list.filters.categoryId ?? ""}
            onChange={(value) => list.setFilter("categoryId", value)}
            options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
          />
          <FilterSelect label="Stock" value={list.filters.stockStatus ?? ""} onChange={(value) => list.setFilter("stockStatus", value)} options={STOCK_STATUS_OPTIONS} className="w-full sm:w-40" />
          <FilterSelect label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={PRODUCT_STATUS_OPTIONS} className="w-full sm:w-40" />
        </TableToolbar>
        <DataTable
          caption="Products"
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
          onRowClick={(row) => router.push(`/products/${row.id}`)}
          empty={<EmptyState title="No products found" description={list.hasActiveFilters ? "Try a different search or clear the filters." : "Add your first product to get started."} />}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete product?"
        description={toDelete && `Delete ${toDelete.name} (${toDelete.sku})? Products with stock history cannot be deleted; mark them as discontinued instead.`}
        confirmLabel="Delete product"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

export function ProductsListView() {
  return (
    <Suspense>
      <ProductsList />
    </Suspense>
  );
}
