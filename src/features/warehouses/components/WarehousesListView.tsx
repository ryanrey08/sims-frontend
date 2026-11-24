"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, Coins, Download, Eye, MapPin, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ACTIVE_STATUS_OPTIONS, WAREHOUSE_TYPE_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useDeleteWarehouseMutation, useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { Warehouse } from "@/types/models";

/** "Multiple Warehouse Management" screen from the SIMS mockups. */
export function WarehousesListView() {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.warehousesManage);
  const list = useListState({ sortBy: "code" });
  const { data, isLoading, isFetching, error, refetch } = useGetWarehousesQuery(list.params);
  // Unfiltered totals for the summary cards.
  const { data: all } = useGetWarehousesQuery({ pageSize: 100 });
  const [deleteWarehouse, { isLoading: deleting }] = useDeleteWarehouseMutation();
  const [toDelete, setToDelete] = useState<Warehouse | null>(null);
  const warehouses = all?.data ?? [];

  const columns: Column<Warehouse>[] = [
    { key: "code", header: "Warehouse Code", sortable: true, cell: (row) => (
      <span className="flex items-center gap-2 font-semibold"><WarehouseIcon className="h-5 w-5 text-brand-600" strokeWidth={1.6} />{row.code}</span>
    ) },
    { key: "name", header: "Warehouse Name", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "type", header: "Type", cell: (row) => <StatusBadge status={row.type} /> },
    { key: "address", header: "Location / Address", hideOnMobile: true, cell: (row) => (
      <span className="flex max-w-56 items-start gap-1.5 text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{row.address}</span>
    ) },
    { key: "itemCount", header: "Stock Items", sortable: true, align: "right", cell: (row) => formatNumber(row.itemCount ?? 0) },
    { key: "stockValue", header: "Stock Value", sortable: true, align: "right", cell: (row) => formatCurrency(row.stockValue ?? 0) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <RowActions
          label={row.name}
          actions={[
            { label: "View warehouse", icon: Eye, onSelect: () => router.push(`/warehouses/${row.id}`) },
            { label: "Edit", icon: Pencil, onSelect: () => router.push(`/warehouses/${row.id}/edit`), hidden: !canManage },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={WarehouseIcon}
        title="Multiple Warehouse Management"
        description="Maintain and manage multiple warehouses, including warehouse details, status, and locations."
        actions={
          <>
            <Can permission={PERMISSIONS.warehousesManage}>
              <ButtonLink href="/warehouses/new" leftIcon={<Plus className="h-4 w-4" />}>Add Warehouse</ButtonLink>
            </Can>
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={!warehouses.length}
              onClick={() => {
                exportToCsv("warehouses", warehouses, [
                  { header: "Code", value: (row) => row.code },
                  { header: "Name", value: (row) => row.name },
                  { header: "Type", value: (row) => row.type },
                  { header: "Address", value: (row) => row.address },
                  { header: "Manager", value: (row) => row.manager },
                  { header: "Stock items", value: (row) => row.itemCount },
                  { header: "Stock value", value: (row) => row.stockValue },
                  { header: "Status", value: (row) => row.status },
                ]);
                toast.success("Export ready", `${warehouses.length} warehouses exported.`);
              }}
            >
              Export
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Warehouses" value={warehouses.length} icon={Building2} loading={!all} />
        <StatCard label="Active Warehouses" value={warehouses.filter((item) => item.status === "active").length} icon={WarehouseIcon} accent="emerald" loading={!all} />
        <StatCard label="Total Stock Value" value={formatCurrency(warehouses.reduce((sum, item) => sum + (item.stockValue ?? 0), 0))} icon={Coins} accent="amber" loading={!all} />
        <StatCard label="Total Stock Items" value={formatNumber(warehouses.reduce((sum, item) => sum + (item.totalUnits ?? 0), 0))} icon={Boxes} accent="sky" loading={!all} />
      </div>
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search warehouse (code, name, location)…" label="Search warehouses" />
          <FilterSelect label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={ACTIVE_STATUS_OPTIONS} className="w-full sm:w-36" />
          <FilterSelect label="Type" value={list.filters.type ?? ""} onChange={(value) => list.setFilter("type", value)} options={WAREHOUSE_TYPE_OPTIONS} />
        </TableToolbar>
        <DataTable
          caption="Warehouses"
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
          onRowClick={(row) => router.push(`/warehouses/${row.id}`)}
          mobileTitleKey="name"
        />
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete warehouse?"
        description={toDelete && `Delete ${toDelete.name}? Warehouses with stock history cannot be deleted; set them to inactive instead.`}
        confirmLabel="Delete warehouse"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteWarehouse(toDelete.id).unwrap();
            toast.success("Warehouse deleted", toDelete.name);
          } catch (deleteError) {
            toast.error("Could not delete warehouse", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
