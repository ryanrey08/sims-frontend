"use client";

import { Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ACTIVE_STATUS_OPTIONS, DEPARTMENT_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { formatRelative } from "@/lib/utils/format";
import { useGetRolesQuery } from "@/services/api/endpoints/rolesApi";
import { useDeleteUserMutation, useGetUsersQuery, useUpdateUserStatusMutation } from "@/services/api/endpoints/usersApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import type { User } from "@/types/models";

export function UsersListView() {
  const router = useRouter();
  const toast = useToast();
  const me = useAppSelector(selectCurrentUser);
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.usersManage);
  const list = useListState({ sortBy: "name" });
  const { data, isLoading, isFetching, error, refetch } = useGetUsersQuery(list.params);
  const { data: roles } = useGetRolesQuery();
  const [updateStatus] = useUpdateUserStatusMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();
  const [toDelete, setToDelete] = useState<User | null>(null);

  const toggle = async (user: User) => {
    const status = user.status === "active" ? "inactive" : "active";
    try {
      await updateStatus({ id: user.id, status }).unwrap();
      toast.success(status === "active" ? "User activated" : "User deactivated", user.name);
    } catch (statusError) {
      toast.error("Could not update user", statusError);
    }
  };

  const columns: Column<User>[] = [
    { key: "name", header: "User", sortable: true, cell: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}{row.id === me?.id && <span className="ml-2 text-xs text-muted">(you)</span>}</p>
          <p className="truncate text-xs text-muted">{row.email}</p>
        </div>
      </div>
    ) },
    { key: "roleName", header: "Role", sortable: true, cell: (row) => row.roleName },
    { key: "department", header: "Department", sortable: true, cell: (row) => row.department },
    { key: "lastLoginAt", header: "Last sign-in", sortable: true, hideOnMobile: true, cell: (row) => (row.lastLoginAt ? formatRelative(row.lastLoginAt) : "Never") },
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
            { label: "View", icon: Eye, onSelect: () => router.push(`/users/${row.id}`) },
            { label: "Edit", icon: Pencil, onSelect: () => router.push(`/users/${row.id}/edit`), hidden: !canManage },
            { label: row.status === "active" ? "Deactivate" : "Activate", icon: Power, onSelect: () => toggle(row), hidden: !canManage || row.id === me?.id },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage || row.id === me?.id },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={UsersIcon}
        title="Users"
        description="Accounts that can sign in to SIMS, with their role and department."
        actions={
          <Can permission={PERMISSIONS.usersManage}>
            <ButtonLink href="/users/new" leftIcon={<Plus className="h-4 w-4" />}>Add user</ButtonLink>
          </Can>
        }
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or email" label="Search users" />
          <FilterSelect label="Role" value={list.filters.roleId ?? ""} onChange={(value) => list.setFilter("roleId", value)} options={(roles?.data ?? []).map((role) => ({ label: role.name, value: role.id }))} />
          <FilterSelect label="Department" value={list.filters.department ?? ""} onChange={(value) => list.setFilter("department", value)} options={DEPARTMENT_OPTIONS} />
          <FilterSelect label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={ACTIVE_STATUS_OPTIONS} className="w-full sm:w-36" />
        </TableToolbar>
        <DataTable
          caption="Users"
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
          onRowClick={(row) => router.push(`/users/${row.id}`)}
        />
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete user?"
        description={toDelete && `${toDelete.name} will no longer be able to sign in. Deactivating keeps their history instead.`}
        confirmLabel="Delete user"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteUser(toDelete.id).unwrap();
            toast.success("User deleted", toDelete.name);
          } catch (deleteError) {
            toast.error("Could not delete user", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
