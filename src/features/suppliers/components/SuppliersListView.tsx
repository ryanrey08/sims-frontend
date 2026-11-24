"use client";

import { Truck as TruckIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ACTIVE_STATUS_OPTIONS, PAYMENT_TERM_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils/format";
import { useDeleteSupplierMutation, useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import type { Supplier } from "@/types/models";

export function SuppliersListView() {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.suppliersManage);
  const list = useListState({ sortBy: "name" });
  const { data, isLoading, isFetching, error, refetch } = useGetSuppliersQuery(list.params);
  const [deleteSupplier, { isLoading: deleting }] = useDeleteSupplierMutation();
  const [toDelete, setToDelete] = useState<Supplier | null>(null);

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Supplier", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="font-mono text-xs text-muted">{row.code}</p>
      </div>
    ) },
    { key: "contactPerson", header: "Contact", sortable: true, cell: (row) => (
      <div>
        <p>{row.contactPerson}</p>
        <p className="text-xs text-muted">{row.phone}</p>
      </div>
    ) },
    { key: "paymentTerms", header: "Terms", sortable: true, cell: (row) => row.paymentTerms },
    { key: "leadTimeDays", header: "Lead time", sortable: true, align: "center", hideOnMobile: true, cell: (row) => `${row.leadTimeDays} days` },
    { key: "orderCount", header: "Orders", sortable: true, align: "center", cell: (row) => row.orderCount ?? 0 },
    { key: "totalPurchased", header: "Purchased", sortable: true, align: "right", cell: (row) => formatCurrency(row.totalPurchased ?? 0) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      cell: (row) => (
        <RowActions
          label={row.name}
          actions={[
            { label: "View details", icon: Eye, onSelect: () => router.push(`/suppliers/${row.id}`) },
            { label: "Edit", icon: Pencil, onSelect: () => router.push(`/suppliers/${row.id}/edit`), hidden: !canManage },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={TruckIcon}
        title="Suppliers"
        description="Vendor directory, payment terms and purchasing history."
        actions={
          <Can permission={PERMISSIONS.suppliersManage}>
            <ButtonLink href="/suppliers/new" leftIcon={<Plus className="h-4 w-4" />}>Add supplier</ButtonLink>
          </Can>
        }
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name, code or contact" label="Search suppliers" />
          <FilterSelect label="Terms" value={list.filters.paymentTerms ?? ""} onChange={(value) => list.setFilter("paymentTerms", value)} options={PAYMENT_TERM_OPTIONS} className="w-full sm:w-36" />
          <FilterSelect label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={ACTIVE_STATUS_OPTIONS} className="w-full sm:w-36" />
        </TableToolbar>
        <DataTable
          caption="Suppliers"
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
          onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete supplier?"
        description={toDelete && `Delete ${toDelete.name}? Suppliers with purchase orders cannot be deleted; deactivate them instead.`}
        confirmLabel="Delete supplier"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteSupplier(toDelete.id).unwrap();
            toast.success("Supplier deleted", toDelete.name);
          } catch (deleteError) {
            toast.error("Could not delete supplier", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
