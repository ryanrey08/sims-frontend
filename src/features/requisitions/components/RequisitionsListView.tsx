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
import { DEPARTMENT_OPTIONS, PRIORITY_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { formatDate } from "@/lib/utils/format";
import { useGetRequisitionsQuery } from "@/services/api/endpoints/requisitionsApi";
import type { Requisition } from "@/types/models";

type Tab = "all" | "pending" | "approved" | "issued" | "rejected" | "cancelled";

function Requisitions() {
  const router = useRouter();
  const initial = (useSearchParams().get("status") as Tab | null) ?? "all";
  const list = useListState({ sortBy: "createdAt", sortOrder: "desc", filters: { status: initial === "all" ? "" : initial } });
  const { data, isLoading, isFetching, error, refetch } = useGetRequisitionsQuery(list.params);
  const pending = useGetRequisitionsQuery({ status: "pending", pageSize: 1 }).data?.meta.total;
  const approved = useGetRequisitionsQuery({ status: "approved", pageSize: 1 }).data?.meta.total;
  const tab = (list.filters.status || "all") as Tab;

  const columns: Column<Requisition>[] = [
    { key: "reqNumber", header: "Requisition", sortable: true, cell: (row) => <span className="font-mono text-xs font-semibold text-brand-900">{row.reqNumber}</span> },
    { key: "department", header: "Department", sortable: true, cell: (row) => (
      <div>
        <p className="font-medium">{row.department}</p>
        <p className="text-xs text-muted">{row.requestedBy}</p>
      </div>
    ) },
    { key: "purpose", header: "Purpose", hideOnMobile: true, cell: (row) => <span className="line-clamp-1 max-w-64 text-muted">{row.purpose}</span> },
    { key: "itemCount", header: "Items", align: "center", cell: (row) => row.itemCount },
    { key: "neededBy", header: "Needed by", sortable: true, cell: (row) => formatDate(row.neededBy) },
    { key: "priority", header: "Priority", sortable: true, cell: (row) => <StatusBadge status={row.priority} /> },
    { key: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Requisitions"
        description="Department requests for supplies: review, approve and issue from stock."
        actions={
          <Can permission={PERMISSIONS.requisitionsCreate}>
            <ButtonLink href="/requisitions/new" leftIcon={<Plus className="h-4 w-4" />}>New requisition</ButtonLink>
          </Can>
        }
      />
      <Card>
        <Tabs
          label="Requisition status"
          className="px-3"
          value={tab}
          onChange={(value) => list.setFilter("status", value === "all" ? "" : value)}
          items={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending", count: pending },
            { value: "approved", label: "To issue", count: approved },
            { value: "issued", label: "Issued" },
            { value: "rejected", label: "Rejected" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <TableToolbar showReset={Boolean(list.search || list.filters.department || list.filters.priority)} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search number, requester or purpose" label="Search requisitions" />
          <FilterSelect label="Department" value={list.filters.department ?? ""} onChange={(value) => list.setFilter("department", value)} options={DEPARTMENT_OPTIONS} />
          <FilterSelect label="Priority" value={list.filters.priority ?? ""} onChange={(value) => list.setFilter("priority", value)} options={PRIORITY_OPTIONS} className="w-full sm:w-36" />
        </TableToolbar>
        <DataTable
          caption="Requisitions"
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
          onRowClick={(row) => router.push(`/requisitions/${row.id}`)}
        />
      </Card>
    </>
  );
}

export function RequisitionsListView() {
  return (
    <Suspense>
      <Requisitions />
    </Suspense>
  );
}
