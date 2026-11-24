"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useGetPurchaseOrdersQuery } from "@/services/api/endpoints/purchaseOrdersApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import type { PurchaseOrder } from "@/types/models";

type Tab = "all" | "draft" | "pending" | "approved" | "partially-received" | "received" | "cancelled";

function PurchaseOrders() {
  const router = useRouter();
  const initial = (useSearchParams().get("status") as Tab | null) ?? "all";
  const list = useListState({ sortBy: "orderDate", sortOrder: "desc", filters: { status: initial === "all" ? "" : initial } });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchaseOrdersQuery(list.params);
  // Small count query for the tab badge; RTK Query caches and dedupes it.
  const pending = useGetPurchaseOrdersQuery({ status: "pending", pageSize: 1 }).data?.meta.total;
  const { data: suppliers } = useGetSuppliersQuery({ pageSize: 100, sortBy: "name" });
  const tab = (list.filters.status || "all") as Tab;

  const columns: Column<PurchaseOrder>[] = [
    { key: "poNumber", header: "PO number", sortable: true, cell: (row) => <span className="font-mono text-xs font-semibold text-brand-900">{row.poNumber}</span> },
    { key: "supplierName", header: "Supplier", sortable: true, cell: (row) => <span className="font-medium">{row.supplierName}</span> },
    { key: "warehouseName", header: "Deliver to", hideOnMobile: true, cell: (row) => row.warehouseName },
    { key: "orderDate", header: "Ordered", sortable: true, cell: (row) => formatDate(row.orderDate) },
    { key: "expectedDate", header: "Expected", sortable: true, hideOnMobile: true, cell: (row) => formatDate(row.expectedDate) },
    { key: "total", header: "Total", sortable: true, align: "right", cell: (row) => formatCurrency(row.total ?? 0) },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Raise, approve and receive orders from suppliers."
        actions={
          <Can permission={PERMISSIONS.purchasingManage}>
            <ButtonLink href="/purchase-orders/new" leftIcon={<Plus className="h-4 w-4" />}>New purchase order</ButtonLink>
          </Can>
        }
      />
      <Card>
        <Tabs
          label="Purchase order status"
          className="px-3"
          value={tab}
          onChange={(value) => list.setFilter("status", value === "all" ? "" : value)}
          items={[
            { value: "all", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "pending", label: "Pending", count: pending },
            { value: "approved", label: "Approved" },
            { value: "partially-received", label: "Partial" },
            { value: "received", label: "Received" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <TableToolbar showReset={Boolean(list.search || list.filters.supplierId || list.filters.from || list.filters.to)} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search PO number or supplier" label="Search purchase orders" />
          <FilterSelect
            label="Supplier"
            value={list.filters.supplierId ?? ""}
            onChange={(value) => list.setFilter("supplierId", value)}
            options={(suppliers?.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
            className="w-full sm:w-56"
          />
        </TableToolbar>
        <DataTable
          caption="Purchase orders"
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
          onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
        />
      </Card>
    </>
  );
}

export function PurchaseOrdersListView() {
  return (
    <Suspense>
      <PurchaseOrders />
    </Suspense>
  );
}
