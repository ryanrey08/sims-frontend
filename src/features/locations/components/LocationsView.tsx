"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Eye, MapPin, MapPinOff, MapPinned, Pencil, Plus, Rows3, Trash2, Upload } from "lucide-react";
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
import { ACTIVE_STATUS_OPTIONS } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { exportToCsv, pickCsvFile } from "@/lib/utils/csv";
import { formatNumber } from "@/lib/utils/format";
import { useDeleteMasterRecordMutation, useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { MasterRecord } from "@/types/records";
import { LocationFormModal } from "./LocationFormModal";

type FormState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; record: MasterRecord };
const text = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));

/** "Warehouse Locations" screen (mockup p6–p8). */
export function LocationsView() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.warehousesManage);
  const list = useListState({ sortBy: "code", filters: { warehouseId: searchParams.get("warehouseId") ?? "" } });
  const [view, setView] = useState<"list" | "grid">("list");
  const { data, isLoading, isFetching, error, refetch } = useGetMasterRecordsQuery({ resource: "locations", params: list.params });
  const { data: all } = useGetMasterRecordsQuery({ resource: "locations", params: { pageSize: 500 } });
  const { data: warehouseData } = useGetWarehousesQuery({ pageSize: 100 });
  const [saveRecord] = useSaveMasterRecordMutation();
  const [deleteRecord, { isLoading: deleting }] = useDeleteMasterRecordMutation();
  const [form, setForm] = useState<FormState>({ mode: "closed" });
  const [saved, setSaved] = useState<{ record: MasterRecord; created: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<MasterRecord | null>(null);

  const warehouses = useMemo(() => warehouseData?.data ?? [], [warehouseData]);
  const warehouseLabel = (id: unknown) => {
    const warehouse = warehouses.find((item) => item.id === id);
    return warehouse ? `${warehouse.code} (${warehouse.name})` : "—";
  };
  const warehouseOptions = warehouses.map((item) => ({ label: `${item.code} (${item.name})`, value: item.id }));
  const records = all?.data ?? [];
  const activeCount = records.filter((item) => item.status === "active").length;

  const importCsv = async () => {
    try {
      const rows = await pickCsvFile();
      let created = 0;
      for (const row of rows) {
        const warehouse = warehouses.find((item) => item.code === (row.warehouse ?? row.warehousecode ?? "").split(" ")[0]);
        try {
          await saveRecord({
            resource: "locations",
            body: {
              code: (row.code ?? row.locationcode ?? "").toUpperCase(),
              name: row.name ?? row.locationname ?? "",
              warehouseId: warehouse?.id ?? "",
              type: row.type ?? "Area",
              zone: row.zone ?? "",
              rack: row.rack ?? "",
              bin: row.bin ?? "",
              capacity: row.capacity ? Number(row.capacity) : null,
              uom: row.uom || "pcs",
              status: row.status?.toLowerCase() === "inactive" ? "inactive" : "active",
            },
          }).unwrap();
          created += 1;
        } catch {
          // Rows that fail validation are skipped and reported below.
        }
      }
      if (rows.length) toast.success("Import complete", `${created} of ${rows.length} locations imported.`);
    } catch (importError) {
      toast.error("Could not read the file", importError);
    }
  };

  const actions = (row: MasterRecord) => (
    <RowActions
      label={String(row.name)}
      actions={[
        { label: "Edit", icon: Pencil, inline: true, onSelect: () => setForm({ mode: "edit", record: row }), hidden: !canManage },
        { label: "Delete", icon: Trash2, inline: true, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
        { label: "View warehouse", icon: Eye, onSelect: () => router.push(`/warehouses/${row.warehouseId}`) },
        { label: "Stock in this location", icon: Rows3, onSelect: () => router.push(`/inventory?warehouseId=${row.warehouseId}`) },
      ]}
    />
  );

  const columns: Column<MasterRecord>[] = [
    { key: "code", header: "Location Code", sortable: true, cell: (row) => <span className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-brand-600" />{String(row.code)}</span> },
    { key: "name", header: "Location Name", sortable: true, cell: (row) => String(row.name) },
    { key: "warehouseId", header: "Warehouse", cell: (row) => warehouseLabel(row.warehouseId) },
    { key: "type", header: "Type", cell: (row) => <StatusBadge status={String(row.type ?? "").toLowerCase()} label={String(row.type ?? "")} /> },
    { key: "zone", header: "Zone", hideOnMobile: true, cell: (row) => text(row.zone) },
    { key: "rack", header: "Rack", hideOnMobile: true, cell: (row) => text(row.rack) },
    { key: "bin", header: "Bin", hideOnMobile: true, cell: (row) => text(row.bin) },
    { key: "capacity", header: "Capacity", sortable: true, align: "right", cell: (row) => (row.capacity ? formatNumber(Number(row.capacity)) : "—") },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={String(row.status)} /> },
    { key: "actions", header: "Actions", align: "center", hideOnMobile: true, cell: actions },
  ];

  return (
    <>
      <PageHeader
        icon={MapPinned}
        title="Warehouse Locations"
        description="Define and manage storage locations within each warehouse (e.g., area, zone, rack, bin)."
        actions={
          <>
            <Can permission={PERMISSIONS.warehousesManage}>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ mode: "new" })}>Add Location</Button>
              <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={importCsv}>Import</Button>
            </Can>
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={!records.length}
              onClick={() => {
                exportToCsv("warehouse-locations", records, [
                  { header: "Location Code", value: (row) => String(row.code) },
                  { header: "Location Name", value: (row) => String(row.name) },
                  { header: "Warehouse", value: (row) => warehouseLabel(row.warehouseId) },
                  { header: "Type", value: (row) => String(row.type ?? "") },
                  { header: "Zone", value: (row) => String(row.zone ?? "") },
                  { header: "Rack", value: (row) => String(row.rack ?? "") },
                  { header: "Bin", value: (row) => String(row.bin ?? "") },
                  { header: "Capacity", value: (row) => (row.capacity as number) ?? "" },
                  { header: "UoM", value: (row) => String(row.uom ?? "") },
                  { header: "Status", value: (row) => String(row.status) },
                ]);
                toast.success("Export ready", `${records.length} locations exported.`);
              }}
            >
              Export
            </Button>
          </>
        }
      />
      <StatGrid columns={4}>
        <StatCard label="Total Locations" value={formatNumber(records.length)} icon={MapPinned} accent="blue" loading={!all} />
        <StatCard label="Active Locations" value={formatNumber(activeCount)} icon={MapPin} accent="green" loading={!all} />
        <StatCard label="Inactive Locations" value={formatNumber(records.length - activeCount)} icon={MapPinOff} accent="yellow" loading={!all} />
        <StatCard
          label="Total Capacity"
          value={<>{formatNumber(records.reduce((sum, item) => sum + Number(item.capacity ?? 0), 0))} <span className="text-xs font-medium text-slate-500">(in base UoM)</span></>}
          icon={Rows3}
          accent="purple"
          loading={!all}
        />
      </StatGrid>
      <Card>
        <TableToolbar showReset={list.hasActiveFilters} onReset={list.resetFilters} view={view} onViewChange={setView}>
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search location (code, name, warehouse)..." label="Search locations" />
          <FilterSelect layout="inline" label="Warehouse" value={list.filters.warehouseId ?? ""} onChange={(value) => list.setFilter("warehouseId", value)} options={warehouses.map((item) => ({ label: item.code, value: item.id }))} />
          <FilterSelect layout="inline" label="Status" value={list.filters.status ?? ""} onChange={(value) => list.setFilter("status", value)} options={ACTIVE_STATUS_OPTIONS} />
        </TableToolbar>
        {view === "grid" ? (
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.data ?? []).map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4 text-[13px]">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-brand-600" />{String(row.code)}</span>
                  <StatusBadge status={String(row.status)} />
                </div>
                <p className="font-medium">{String(row.name)}</p>
                <p className="text-slate-600">{warehouseLabel(row.warehouseId)}</p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={String(row.type ?? "").toLowerCase()} label={String(row.type ?? "")} />
                  <span className="text-slate-600">Capacity: <b>{row.capacity ? formatNumber(Number(row.capacity)) : "—"}</b></span>
                </div>
                <div className="flex justify-end border-t border-line pt-2">{actions(row)}</div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            caption="Warehouse locations"
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
            mobileTitleKey="name"
          />
        )}
      </Card>
      <LocationFormModal
        open={form.mode !== "closed"}
        record={form.mode === "edit" ? form.record : undefined}
        warehouseOptions={warehouseOptions}
        defaultWarehouseId={list.filters.warehouseId}
        onClose={() => setForm({ mode: "closed" })}
        onSaved={(record, created) => {
          setForm({ mode: "closed" });
          setSaved({ record, created });
        }}
      />
      <SuccessDialog
        open={Boolean(saved)}
        title="Location Saved Successfully"
        message={saved && <>The location <b>&quot;{String(saved.record.name)}&quot;</b> ({String(saved.record.code)}) has been {saved.created ? "created" : "updated"} and saved.</>}
        onClose={() => setSaved(null)}
        actions={
          <>
            <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setSaved(null); setForm({ mode: "new" }); }}>Add Another Location</Button>
            <Button onClick={() => setSaved(null)}>View Locations</Button>
          </>
        }
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete location?"
        description={toDelete && `Delete ${String(toDelete.name)} (${String(toDelete.code)})? Locations in use cannot be deleted; set them to inactive instead.`}
        confirmLabel="Delete location"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteRecord({ resource: "locations", id: toDelete.id }).unwrap();
            toast.success("Location deleted", String(toDelete.name));
          } catch (deleteError) {
            toast.error("Could not delete location", deleteError);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
