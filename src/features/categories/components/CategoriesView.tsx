"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField, fieldA11y } from "@/components/forms/FormField";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ACTIVE_STATUS_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors } from "@/lib/utils/errors";
import { optionalString, requiredString } from "@/schemas/common";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "@/services/api/endpoints/categoriesApi";
import type { Category } from "@/types/models";

const categorySchema = z.object({
  code: z.string().trim().min(2, "Code is required.").max(6).regex(/^[A-Z0-9]+$/, "Use uppercase letters and numbers."),
  name: requiredString("Category name", 60),
  description: optionalString(200),
  status: z.enum(["active", "inactive"]),
});
type CategoryValues = z.infer<typeof categorySchema>;

function CategoryDialog({ category, open, onClose }: { category: Category | null; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    values: category
      ? { code: category.code, name: category.name, description: category.description, status: category.status }
      : { code: "", name: "", description: "", status: "active" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, description: values.description ?? "" };
    try {
      const saved = category ? await updateCategory({ id: category.id, body }).unwrap() : await createCategory(body).unwrap();
      toast.success(category ? "Category updated" : "Category added", saved.name);
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save category", error);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "Add category"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="category-form" loading={isSubmitting}>{category ? "Save changes" : "Add category"}</Button>
        </>
      }
    >
      <form id="category-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Code" htmlFor="code" required error={errors.code?.message}>
          <Input className="uppercase" {...fieldA11y("code", errors.code?.message)} {...register("code", { setValueAs: (value: string) => value.toUpperCase() })} />
        </FormField>
        <FormField label="Status" htmlFor="status" required>
          <Select options={ACTIVE_STATUS_OPTIONS} {...fieldA11y("status")} {...register("status")} />
        </FormField>
        <FormField label="Name" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
          <Input {...fieldA11y("name", errors.name?.message)} {...register("name")} />
        </FormField>
        <FormField label="Description" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={2} {...fieldA11y("description", errors.description?.message)} {...register("description")} />
        </FormField>
      </form>
    </Modal>
  );
}

export function CategoriesView() {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.productsManage);
  const list = useListState({ sortBy: "name", pageSize: 20 });
  const { data, isLoading, isFetching, error, refetch } = useGetCategoriesQuery(list.params);
  const [deleteCategory, { isLoading: deleting }] = useDeleteCategoryMutation();
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const openDialog = (category: Category | null) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const columns: Column<Category>[] = [
    { key: "code", header: "Code", sortable: true, cell: (row) => <span className="font-mono text-xs font-semibold text-brand-900">{row.code}</span> },
    { key: "name", header: "Category", sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "description", header: "Description", hideOnMobile: true, cell: (row) => <span className="text-muted">{row.description || "—"}</span> },
    { key: "productCount", header: "Products", sortable: true, align: "center", cell: (row) => row.productCount ?? 0 },
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
            { label: "View products", icon: Eye, onSelect: () => router.push(`/products?categoryId=${row.id}`) },
            { label: "Edit", icon: Pencil, onSelect: () => openDialog(row), hidden: !canManage },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products for reporting, filtering and valuation."
        actions={
          <Can permission={PERMISSIONS.productsManage}>
            <Button onClick={() => openDialog(null)} leftIcon={<Plus className="h-4 w-4" />}>Add category</Button>
          </Can>
        }
      />
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search categories" label="Search categories" />
        </TableToolbar>
        <DataTable
          caption="Categories"
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
          onRowClick={(row) => router.push(`/products?categoryId=${row.id}`)}
          mobileTitleKey="name"
        />
      </Card>
      <CategoryDialog open={dialogOpen} category={editing} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete category?"
        description={toDelete && `Delete ${toDelete.name}? Categories that still contain products cannot be deleted.`}
        confirmLabel="Delete category"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteCategory(toDelete.id).unwrap();
            toast.success("Category deleted", toDelete.name);
          } catch (deleteError) {
            toast.error("Could not delete category", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
