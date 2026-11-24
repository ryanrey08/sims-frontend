"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Database, Download, Layers, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DynamicField, optionLabel, schemaForFields, toApiValues } from "@/components/forms/DynamicField";
import { RequiredNote } from "@/components/forms/FormField";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { getMasterData, type FieldDef, type MasterDataDef } from "@/config/masterData";
import { Unauthorized } from "@/components/common/Unauthorized";
import { STATUS_META } from "@/constants/status";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/lib/utils/csv";
import { applyServerErrors } from "@/lib/utils/errors";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { useDeleteMasterRecordMutation, useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import type { MasterRecord } from "@/types/records";

/** Formats a master-data value for display in tables. */
export function displayValue(field: FieldDef, record: MasterRecord): React.ReactNode {
  const value = record[field.name];
  if (value === null || value === undefined || value === "") return <span className="text-slate-300">—</span>;
  if (field.optionsFrom) return String(record[`${field.name}__label`] ?? value);
  if (field.type === "currency") return formatCurrency(Number(value));
  if (field.type === "number") return formatNumber(Number(value));
  if (field.type === "date") return formatDate(String(value));
  if (field.type === "select" && STATUS_META[String(value)]) return <StatusBadge status={String(value)} />;
  return String(value);
}

function RecordDialog({ def, record, open, onClose }: { def: MasterDataDef; record: MasterRecord | null; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [save] = useSaveMasterRecordMutation();
  const initial = Object.fromEntries(def.fields.map((field) => [field.name, record?.[field.name] === null || record?.[field.name] === undefined ? (field.name === "status" ? (field.options?.[0] ?? "") : "") : String(record[field.name])]));
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({ resolver: zodResolver(schemaForFields(def.fields)), values: initial });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save({ resource: def.key, id: record?.id, body: toApiValues(def.fields, values) }).unwrap();
      toast.success(record ? `${def.title} updated` : `${def.singular[0].toUpperCase()}${def.singular.slice(1)} saved successfully`, String(saved[def.labelField] ?? ""));
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error(`Could not save ${def.singular}`, error);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={record ? `Edit ${def.singular}` : `Add ${def.singular}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form={`${def.key}-form`} loading={isSubmitting}>Save {def.singular}</Button>
        </>
      }
    >
      <form id={`${def.key}-form`} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><RequiredNote /></div>
        {def.fields.map((field) => (
          <DynamicField
            key={field.name}
            field={field}
            registration={register(field.name)}
            error={errors[field.name]?.message}
            className={field.type === "textarea" ? "sm:col-span-2" : undefined}
          />
        ))}
      </form>
    </Modal>
  );
}

/** Generic registry screen (list, search, filters, add/edit modal, delete, export) driven by MASTER_DATA config. */
export function MasterDataView({ resource }: { resource: string }) {
  const def = getMasterData(resource);
  if (!def) return <Unauthorized />;
  return <MasterDataScreen key={def.key} def={def} />;
}

function MasterDataScreen({ def }: { def: MasterDataDef }) {
  useBreadcrumbLabel(def.key, def.title);
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(def.managePermission);
  const list = useListState({ sortBy: def.codeField });
  const { data, isLoading, isFetching, error, refetch } = useGetMasterRecordsQuery({ resource: def.key, params: list.params });
  const { data: all } = useGetMasterRecordsQuery({ resource: def.key, params: { pageSize: 200 } });
  const [deleteRecord, { isLoading: deleting }] = useDeleteMasterRecordMutation();
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<MasterRecord | null>(null);
  const filterFields = def.fields.filter((field) => field.type === "select" && field.list && !field.optionsFrom).slice(0, 2);
  const records = all?.data ?? [];
  const activeCount = records.filter((record) => ["active", "assigned", "available"].includes(String(record.status))).length;

  const openDialog = (record: MasterRecord | null) => {
    setEditing(record);
    setDialogOpen(true);
  };

  const columns: Column<MasterRecord>[] = [
    ...def.fields
      .filter((field) => field.list)
      .map((field, index) => ({
        key: field.name,
        header: field.label,
        sortable: !field.optionsFrom,
        align: field.type === "number" || field.type === "currency" ? ("right" as const) : undefined,
        hideOnMobile: index > 3,
        cell: (record: MasterRecord) => (index === 0 ? <span className="font-semibold text-ink">{String(record[field.name] ?? "")}</span> : displayValue(field, record)),
      })),
    {
      key: "actions",
      header: "Actions",
      align: "right",
      hideOnMobile: true,
      cell: (record) => (
        <RowActions
          label={String(record[def.labelField] ?? "record")}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => openDialog(record), hidden: !canManage },
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(record), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={Database}
        title={def.title}
        description={def.description}
        actions={
          <>
            <Can permission={def.managePermission}>
              <Button onClick={() => openDialog(null)} leftIcon={<Plus className="h-4 w-4" />}>Add {def.singular}</Button>
            </Can>
            <Button
              variant="outline"
              disabled={!records.length}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                exportToCsv(def.key, records, def.fields.map((field) => ({ header: field.label, value: (record: MasterRecord) => String(record[`${field.name}__label`] ?? record[field.name] ?? "") })));
                toast.success("Export ready", `${records.length} records exported.`);
              }}
            >
              Export
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={`Total ${def.title}`} value={records.length} icon={Layers} loading={!all} />
        <StatCard label="Active" value={activeCount} icon={CheckCircle2} accent="emerald" loading={!all} />
        <StatCard label="Inactive / Other" value={records.length - activeCount} icon={XCircle} accent="amber" loading={!all} />
      </div>
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder={`Search ${def.title.toLowerCase()}…`} label={`Search ${def.title}`} />
          {filterFields.map((field) => (
            <FilterSelect
              key={field.name}
              label={field.label}
              value={list.filters[field.name] ?? ""}
              onChange={(value) => list.setFilter(field.name, value)}
              options={(field.options ?? []).map((value) => ({ label: optionLabel(value), value }))}
            />
          ))}
        </TableToolbar>
        <DataTable
          caption={def.title}
          columns={columns}
          rows={data?.data}
          rowKey={(record) => record.id}
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
          onRowClick={canManage ? openDialog : undefined}
        />
      </Card>
      {dialogOpen && <RecordDialog def={def} record={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} />}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${def.singular}?`}
        description={toDelete && `Delete ${String(toDelete[def.labelField])}? Records that are in use cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteRecord({ resource: def.key, id: toDelete.id }).unwrap();
            toast.success("Deleted", String(toDelete[def.labelField]));
          } catch (deleteError) {
            toast.error(`Could not delete ${def.singular}`, deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
