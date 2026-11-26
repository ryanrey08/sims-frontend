"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Boxes, Download, Eye, MapPin, MapPinned, Pencil, Plus, Trash2, Upload, Warehouse as WarehouseIcon } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SuccessDialog } from "@/components/common/SuccessDialog";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ACTIVE_STATUS_OPTIONS, WAREHOUSE_TYPE_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { exportToCsv, pickCsvFile } from "@/lib/utils/csv";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useCreateWarehouseMutation, useDeleteWarehouseMutation, useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { Warehouse } from "@/types/models";
import { WarehouseFormModal } from "./WarehouseFormModal";

type FormState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; warehouse: Warehouse };

function CodeCell({ row }: { row: Warehouse }) {
  return (
    <span className="flex items-center gap-2.5 font-bold">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <WarehouseIcon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      {row.code}
    </span>
  );
}

/** "Multiple Warehouse Management" screen (mockup p3–p5). */
export function WarehousesListView({ initialForm = "closed", editId }: { initialForm?: "closed" | "new" | "edit"; editId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.warehousesManage);
  const list = useListState({ sortBy: "code" });
  const [view, setView] = useState<"list" | "grid">("list");
  const { data, isLoading, isFetching, error, refetch } = useGetWarehousesQuery(list.params);
  // Unfiltered totals for the summary cards.
  const { data: all } = useGetWarehousesQuery({ pageSize: 100 });
  const [deleteWarehouse, { isLoading: deleting }] = useDeleteWarehouseMutation();
  const [createWarehouse] = useCreateWarehouseMutation();
  const [toDelete, setToDelete] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<FormState>(initialForm === "new" ? { mode: "new" } : { mode: "closed" });
  const [saved, setSaved] = useState<{ warehouse: Warehouse; created: boolean } | null>(null);
  const warehouses = all?.data ?? [];

  // Deep link /warehouses/:id/edit opens the edit modal once the record is loaded.
  const pendingEdit = initialForm === "edit" && editId && form.mode === "closed" && !saved ? warehouses.find((item) => item.id === editId) : undefined;
  if (pendingEdit) setForm({ mode: "edit", warehouse: pendingEdit });

  const closeForm = () => {
    setForm({ mode: "closed" });
    if (initialForm !== "closed") router.replace("/warehouses");
  };

  const importCsv = async () => {
    try {
      const rows = await pickCsvFile();
      if (!rows.length) return;
      let created = 0;
      const failed: string[] = [];
      for (const row of rows) {
        try {
          await createWarehouse({
            code: (row.code ?? row.warehousecode ?? "").toUpperCase(),
            name: row.name ?? row.warehousename ?? "",
            type: (["central", "supplies", "property", "field"].includes((row.type ?? "").toLowerCase()) ? row.type.toLowerCase() : "central") as Warehouse["type"],
            address: row.address ?? row.locationaddress ?? "",
            region: row.region ?? "",
            city: row.city ?? row.citymunicipality ?? "",
            barangay: row.barangay ?? "",
            postalCode: row.postalcode ?? "",
            manager: row.manager ?? "",
            phone: row.phone ?? "",
            status: row.status?.toLowerCase() === "inactive" ? "inactive" : "active",
          }).unwrap();
          created += 1;
        } catch {
          failed.push(row.code || row.warehousecode || "(no code)");
        }
      }
      if (created) toast.success("Import complete", `${created} warehouse${created === 1 ? "" : "s"} imported.`);
      if (failed.length) toast.error("Some rows were skipped", `Check codes: ${failed.slice(0, 5).join(", ")}`);
    } catch (importError) {
      toast.error("Could not read the file", importError);
    }
  };

  const actions = (row: Warehouse) => (
    <RowActions
      label={row.name}
      actions={[
        { label: "Edit", icon: Pencil, inline: true, onSelect: () => setForm({ mode: "edit", warehouse: row }), hidden: !canManage },
        { label: "View locations", icon: MapPin, inline: true, danger: true, onSelect: () => router.push(`/warehouses/locations?warehouseId=${row.id}`) },
        { label: "View warehouse", icon: Eye, onSelect: () => router.push(`/warehouses/${row.id}`) },
        { label: "Stock transfer", icon: ArrowLeftRight, onSelect: () => router.push("/transfers/new") },
        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
      ]}
    />
  );

  const columns: Column<Warehouse>[] = [
    { key: "code", header: "Warehouse Code", sortable: true, cell: (row) => <CodeCell row={row} /> },
    { key: "name", header: "Warehouse Name", sortable: true, cell: (row) => row.name },
    { key: "type", header: "Type", cell: (row) => <StatusBadge status={row.type} /> },
    {
      key: "address",
      header: "Location / Address",
      hideOnMobile: true,
      cell: (row) => (
        <span className="flex max-w-60 items-start gap-1.5 leading-snug text-slate-700">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span>
            {row.address}
            {row.postalCode && <span className="block text-slate-500">{[row.barangay, row.postalCode].filter(Boolean).join(" ")}</span>}
          </span>
        </span>
      ),
    },
    { key: "locationCount", header: "No. of Locations", align: "center", cell: (row) => formatNumber(row.locationCount ?? 0) },
    { key: "totalUnits", header: "Stock Items", sortable: true, align: "right", cell: (row) => formatNumber(row.totalUnits ?? 0) },
    { key: "stockValue", header: "Stock Value", sortable: true, align: "right", cell: (row) => formatCurrency(row.stockValue ?? 0) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "Actions", align: "center", hideOnMobile: true, cell: actions },
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
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ mode: "new" })}>Add Warehouse</Button>
              <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={importCsv}>Import</Button>
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
                  { header: "Region", value: (row) => row.region },
                  { header: "City", value: (row) => row.city },
                  { header: "Barangay", value: (row) => row.barangay },
                  { header: "Postal Code", value: (row) => row.postalCode },
                  { header: "No. of Locations", value: (row) => row.locationCount },
                  { header: "Stock Items", value: (row) => row.totalUnits },
                  { header: "Stock Value", value: (row) => row.stockValue },
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
      <StatGrid columns={4}>
        <StatCard label="Total Warehouses" value={warehouses.length} icon={WarehouseIcon} accent="blue" loading={!all} />
        <StatCard label="Total Locations" value={formatNumber(warehouses.reduce((sum, item) => sum + (item.locationCount ?? 0), 0))} icon={MapPinned} accent="green" loading={!all} />
        <StatCard label="Total Stock Value" value={formatCurrency(warehouses.reduce((sum, item) => sum + (item.stockValue ?? 0), 0))} icon={Boxes} accent="yellow" loading={!all} />
        <StatCard label="Total Stock Items" value={formatNumber(warehouses.reduce((sum, item) => sum + (item.totalUnits ?? 0), 0))} icon={ArrowLeftRight} accent="purple" loading={!all} />
      </StatGrid>
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters} view={view} onViewChange={setView}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search warehouse (code, name, location)..." label="Search warehouses" />
          <FilterSelect layout="inline" label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={ACTIVE_STATUS_OPTIONS} />
          <FilterSelect layout="inline" label="Type" value={list.filters.type ?? ""} onChange={(value) => list.setFilter("type", value)} options={WAREHOUSE_TYPE_OPTIONS} />
        </TableToolbar>
        {view === "grid" ? (
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.data ?? []).map((row) => (
              <div key={row.id} className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="text-left" onClick={() => router.push(`/warehouses/${row.id}`)}>
                    <CodeCell row={row} />
                    <span className="mt-1 block text-[13px] text-slate-700">{row.name}</span>
                  </button>
                  <StatusBadge status={row.status} />
                </div>
                <StatusBadge status={row.type} />
                <p className="flex items-start gap-1.5 text-[13px] text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{row.address}</p>
                <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                  <div><dt className="text-slate-500">Locations</dt><dd className="font-bold">{formatNumber(row.locationCount ?? 0)}</dd></div>
                  <div><dt className="text-slate-500">Stock Items</dt><dd className="font-bold">{formatNumber(row.totalUnits ?? 0)}</dd></div>
                  <div><dt className="text-slate-500">Value</dt><dd className="font-bold">{formatCurrency(row.stockValue ?? 0)}</dd></div>
                </dl>
                <div className="flex justify-end">{actions(row)}</div>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </Card>
      <WarehouseFormModal
        open={form.mode !== "closed"}
        warehouse={form.mode === "edit" ? form.warehouse : undefined}
        onClose={closeForm}
        onSaved={(warehouse, created) => {
          setForm({ mode: "closed" });
          setSaved({ warehouse, created });
        }}
      />
      <SuccessDialog
        open={Boolean(saved)}
        title="Warehouse Saved Successfully"
        message={saved && <>The warehouse <b>&quot;{saved.warehouse.name}&quot;</b> ({saved.warehouse.code}) has been {saved.created ? "created" : "updated"} and saved.</>}
        onClose={() => {
          setSaved(null);
          if (initialForm !== "closed") router.replace("/warehouses");
        }}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setSaved(null);
                setForm({ mode: "new" });
              }}
            >
              Add Another Warehouse
            </Button>
            <Button
              onClick={() => {
                setSaved(null);
                if (initialForm !== "closed") router.replace("/warehouses");
              }}
            >
              View Warehouses
            </Button>
          </>
        }
      />
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
