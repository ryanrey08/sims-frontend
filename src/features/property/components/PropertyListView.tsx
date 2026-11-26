"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, BarChart3, Boxes, Building2, Calculator, CheckCircle2, ClipboardList, Download, Eye, FileSpreadsheet, History, Landmark, List, MapPin, Pencil, Plus, Printer, Ruler, Search, Trash2, Upload, Wrench, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SuccessDialog } from "@/components/common/SuccessDialog";
import { FormBlock } from "@/components/forms/HField";
import { RowActions } from "@/components/tables/RowActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PROPERTY_CATEGORIES } from "@/config/masterData";
import { categoryTone } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermission";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { exportToCsv, pickCsvFile } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { useDeleteMasterRecordMutation, useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import type { MasterRecord } from "@/types/records";
import { PropertyFormModal, depreciation } from "./PropertyFormModal";
import { KeyValues, PropertyDetailsPanel, SimplePager, cell, head, text } from "./shared";

const STATUS_FILTER = [
  { label: "In Service", value: "available" },
  { label: "In Use", value: "assigned" },
  { label: "For Maintenance", value: "for-maintenance" },
  { label: "For Disposal", value: "for-disposal" },
  { label: "Transferred", value: "transferred" },
  { label: "Disposed", value: "disposed" },
  { label: "Lost", value: "lost" },
];

/** Links in the Property Management tab row (p51): each opens its screen. */
const MODULE_TABS = [
  { href: "/property", label: "Property List", icon: List },
  { href: "/property/transactions", label: "Property Transactions", icon: ArrowLeftRight },
  { href: "/property/master", label: "Property Master", icon: Landmark },
  { href: "/property/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/property/disposal", label: "Disposal", icon: Trash2 },
  { href: "/property/reports", label: "Reports", icon: BarChart3 },
];

/**
 * Property Management list (p51) and Property Master (p62): summary, filters, property table,
 * details panel, New Property modal (p52 / p63–p66) and the success dialog (p53).
 */
export function PropertyListView({ variant }: { variant: "management" | "master" }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.propertyManage);
  const { data, isLoading } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });
  const locations = useReferenceOptions("locations");
  const [saveRecord] = useSaveMasterRecordMutation();
  const [deleteRecord, { isLoading: deleting }] = useDeleteMasterRecordMutation();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; record?: MasterRecord }>({ open: false });
  const [saved, setSaved] = useState<MasterRecord | null>(null);
  const [toDelete, setToDelete] = useState<MasterRecord | null>(null);
  const [masterTab, setMasterTab] = useState<"master" | "depreciation">("master");
  const all = useMemo(() => data?.data ?? [], [data]);

  const rows = all.filter(
    (row) =>
      (!filters.propertyType || row.propertyType === filters.propertyType) &&
      (!filters.category || row.category === filters.category) &&
      (!filters.locationId || row.locationId === filters.locationId) &&
      (!filters.status || row.status === filters.status) &&
      (!search || `${row.propertyNo} ${row.description} ${row.serialNo}`.toLowerCase().includes(search.toLowerCase())),
  );
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const focus = rows.find((row) => row.id === focusId) ?? pageRows[0];
  const count = (test: (row: MasterRecord) => boolean) => all.filter(test).length;

  const exportRows = () => {
    exportToCsv(variant === "master" ? "property-master" : "properties", rows, [
      { header: "Property No.", value: (row) => String(row.propertyNo) },
      { header: "Description", value: (row) => String(row.description) },
      { header: "Category", value: (row) => text(row, "category") },
      { header: "Serial No.", value: (row) => text(row, "serialNo") },
      { header: "Acquisition Date", value: (row) => String(row.acquisitionDate ?? "") },
      { header: "Acquisition Cost", value: (row) => Number(row.acquisitionCost ?? 0) },
      { header: "Location", value: (row) => text(row, "locationId") },
      { header: "Custodian", value: (row) => text(row, "accountableId") },
      { header: "Condition", value: (row) => text(row, "condition") },
      { header: "Status", value: (row) => String(row.status) },
    ]);
    toast.success("Export ready", `${rows.length} properties exported.`);
  };

  const importRows = async () => {
    try {
      const csv = await pickCsvFile();
      let created = 0;
      for (const row of csv) {
        try {
          await saveRecord({
            resource: "properties",
            body: {
              propertyNo: row.propertyno ?? "",
              description: row.description ?? "",
              category: row.category || "Office Equipment",
              propertyType: row.propertytype || "Equipment",
              classificationId: all[0]?.classificationId ?? null,
              serialNo: row.serialno ?? "",
              acquisitionDate: row.acquisitiondate ?? "",
              acquisitionCost: Number(row.acquisitioncost ?? 0),
              locationId: locations.options[0]?.value ? String(locations.options[0].value) : null,
              condition: row.condition || "Serviceable",
              status: "available",
            },
          }).unwrap();
          created += 1;
        } catch {
          // Invalid rows are skipped and counted below.
        }
      }
      if (csv.length) toast.success("Import complete", `${created} of ${csv.length} properties imported.`);
    } catch (error) {
      toast.error("Could not read the file", error);
    }
  };

  const actions = (row: MasterRecord) => (
    <RowActions
      label={String(row.propertyNo)}
      actions={[
        { label: "View", icon: Eye, inline: true, onSelect: () => setFocusId(row.id) },
        { label: "Edit", icon: Pencil, inline: true, onSelect: () => setForm({ open: true, record: row }), hidden: !canManage },
        { label: "Property card", icon: ClipboardList, onSelect: () => router.push(`/forms/property-card?propertyId=${row.id}`) },
        { label: "Request maintenance", icon: Wrench, onSelect: () => router.push(`/property/maintenance?new=${row.id}`) },
        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
      ]}
    />
  );

  const filtersBar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      {variant === "management" && (
        <FilterSelect layout="stacked" label="Property Type" allLabel="All Types" value={draft.propertyType ?? ""} onChange={(value) => setDraft((current) => ({ ...current, propertyType: value }))} options={["Equipment", "Furniture", "Vehicle", "Building", "Other"].map((value) => ({ label: value, value }))} />
      )}
      <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.category ?? ""} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} options={PROPERTY_CATEGORIES.map((value) => ({ label: value, value }))} />
      <FilterSelect layout="stacked" label="Location" allLabel="All Locations" value={draft.locationId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, locationId: value }))} options={locations.options} />
      <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={STATUS_FILTER} />
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <span className="text-xs font-semibold text-slate-700">Search</span>
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by property no., description, serial no..." label="Search properties" />
      </div>
      <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => { setFilters(draft); setPage(1); }}>Search</Button>
      {Object.values(filters).some(Boolean) && <Button variant="ghost" onClick={() => { setDraft({}); setFilters({}); }}>Reset</Button>}
    </div>
  );

  const toolbarButtons = (
    <Can permission={PERMISSIONS.propertyManage}>
      <Button size="sm" onClick={() => setForm({ open: true })} leftIcon={<Plus className="h-4 w-4" />}>New Property</Button>
      <Button size="sm" variant="outline" onClick={importRows} leftIcon={<Upload className="h-4 w-4" />}>Import (Excel)</Button>
      <Button size="sm" variant="outline" onClick={exportRows} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>Export (Excel)</Button>
      {variant === "master" && <Button size="sm" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>}
    </Can>
  );

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className={head}>
            <th className={cell}>#</th><th className={cell}>Property No.</th><th className={cell}>Description</th><th className={cell}>Category</th><th className={cell}>Serial No.</th>
            {variant === "master" && <><th className={cell}>UOM</th><th className={cn(cell, "text-right")}>Acquisition Cost</th><th className={cell}>Acquisition Date</th></>}
            <th className={cell}>Location</th><th className={cell}>Status</th><th className={cn(cell, "text-center")}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {pageRows.map((row, index) => (
            <tr key={row.id} onClick={() => setFocusId(row.id)} className={cn("cursor-pointer", focus?.id === row.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
              <td className={cn(cell, "text-slate-500")}>{(page - 1) * 10 + index + 1}</td>
              <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6] underline underline-offset-2")}>{String(row.propertyNo)}</td>
              <td className={cell}>{String(row.description)}</td>
              <td className={cell}><Badge tone={categoryTone(String(row.category))}>{text(row, "category")}</Badge></td>
              <td className={cell}>{text(row, "serialNo")}</td>
              {variant === "master" && (
                <>
                  <td className={cell}>{text(row, "uom")}</td>
                  <td className={cn(cell, "text-right")}>{formatCurrency(Number(row.acquisitionCost ?? 0))}</td>
                  <td className={cn(cell, "whitespace-nowrap")}>{formatDate(String(row.acquisitionDate ?? ""))}</td>
                </>
              )}
              <td className={cell}>{text(row, "locationId").split(" – ").pop()}</td>
              <td className={cell}><StatusBadge status={String(row.status)} /></td>
              <td className={cell} onClick={(event) => event.stopPropagation()}>{actions(row)}</td>
            </tr>
          ))}
          {!pageRows.length && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">{isLoading ? "Loading…" : "No properties match the filters."}</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const dialogs = (
    <>
      <PropertyFormModal
        open={form.open}
        record={form.record}
        onClose={() => setForm({ open: false })}
        onSaved={(record, created) => {
          setForm({ open: false });
          setFocusId(record.id);
          if (created) setSaved(record);
          else toast.success("Property updated", String(record.propertyNo));
        }}
      />
      <SuccessDialog
        open={Boolean(saved)}
        title="Property Saved Successfully!"
        message="The property has been created and recorded in the system."
        details={saved ? [{ label: "Property No.", value: String(saved.propertyNo) }, { label: "Description", value: String(saved.description) }, { label: "Serial No.", value: text(saved, "serialNo") }] : undefined}
        onClose={() => setSaved(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/inventory/labels")} leftIcon={<Printer className="h-4 w-4" />}>Print Label</Button>
            <Button variant="outline" onClick={() => { setSaved(null); setForm({ open: true }); }} leftIcon={<Plus className="h-4 w-4" />}>Add Another</Button>
            <Button onClick={() => setSaved(null)}>OK</Button>
          </>
        }
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete property?"
        description={toDelete && `Delete ${String(toDelete.propertyNo)} (${String(toDelete.description)})? Properties used in documents cannot be deleted; dispose of them instead.`}
        confirmLabel="Delete property"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteRecord({ resource: "properties", id: toDelete.id }).unwrap();
            toast.success("Property deleted", String(toDelete.propertyNo));
          } catch (error) {
            toast.error("Could not delete property", error);
          }
          setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      />
    </>
  );

  if (variant === "master") {
    const plan = focus ? depreciation(Number(focus.acquisitionCost ?? 0), Number(focus.salvageValue ?? 0), Number(focus.usefulLife ?? 0), String(focus.acquisitionDate ?? "")) : null;
    const MASTER_TABS: { key: string; label: string; icon: typeof Landmark; href?: string }[] = [
      { key: "master", label: "Property Master", icon: Landmark },
      { key: "categories", label: "Property Categories", icon: Boxes, href: "/masters/property-classifications" },
      { key: "accounts", label: "Property Accounts", icon: Building2, href: "/masters/property-classifications" },
      { key: "uom", label: "UOM", icon: Ruler, href: "/masters/units" },
      { key: "locations", label: "Locations", icon: MapPin, href: "/warehouses/locations" },
      { key: "depreciation", label: "Depreciation Setup", icon: Calculator },
    ];
    return (
      <>
        <PageHeader icon={Landmark} title="Property Master" description="Maintain the register of property, plant and equipment with acquisition, location and depreciation details." />
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 bg-brand-600 px-4 py-3 text-white"><Landmark className="h-5 w-5" /><h2 className="text-base font-bold">Property Master</h2></div>
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              {MASTER_TABS.map((item) => {
                const Icon = item.icon;
                const active = !item.href && masterTab === item.key;
                const classes = cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold", active ? "border-[#2f6fd6] bg-[#eaf2fe] text-[#2f6fd6]" : "border-line text-slate-700 hover:bg-slate-50");
                return item.href ? (
                  <Link key={item.key} href={item.href} className={classes}><Icon className="h-4 w-4" />{item.label}</Link>
                ) : (
                  <button key={item.key} type="button" className={classes} aria-pressed={active} onClick={() => setMasterTab(item.key as "master" | "depreciation")}><Icon className="h-4 w-4" />{item.label}</button>
                );
              })}
            </div>
            {filtersBar}
            <div className="flex flex-wrap justify-end gap-2">{toolbarButtons}</div>
            <div className="overflow-hidden rounded-lg border border-line">
              {masterTab === "master" ? (
                table
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-[13px]">
                    <thead><tr className={head}><th className={cell}>Property No.</th><th className={cell}>Description</th><th className={cell}>Method</th><th className={cn(cell, "text-right")}>Useful Life</th><th className={cn(cell, "text-right")}>Acquisition Cost</th><th className={cn(cell, "text-right")}>Annual Depreciation</th><th className={cn(cell, "text-right")}>Accumulated</th><th className={cn(cell, "text-right")}>Book Value</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((row) => {
                        const value = depreciation(Number(row.acquisitionCost ?? 0), Number(row.salvageValue ?? 0), Number(row.usefulLife ?? 0), String(row.acquisitionDate ?? ""));
                        return (
                          <tr key={row.id}>
                            <td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{String(row.propertyNo)}</td>
                            <td className={cell}>{String(row.description)}</td>
                            <td className={cell}>{text(row, "depreciationMethod")}</td>
                            <td className={cn(cell, "text-right")}>{text(row, "usefulLife")} yrs</td>
                            <td className={cn(cell, "text-right")}>{formatCurrency(Number(row.acquisitionCost ?? 0))}</td>
                            <td className={cn(cell, "text-right")}>{formatCurrency(value.annual)}</td>
                            <td className={cn(cell, "text-right")}>{formatCurrency(value.accumulated)}</td>
                            <td className={cn(cell, "text-right font-semibold")}>{formatCurrency(value.bookValue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <SimplePager page={page} total={rows.length} onPage={setPage} />
            </div>
            {focus && plan && (
              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <FormBlock title={`Property Details – ${String(focus.propertyNo)}`} icon={Landmark}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <KeyValues rows={[["Description", String(focus.description)], ["Category", text(focus, "category")], ["Serial No.", text(focus, "serialNo")], ["Acquisition Date", formatDate(String(focus.acquisitionDate ?? ""))], ["Acquisition Cost", formatCurrency(Number(focus.acquisitionCost ?? 0))], ["Location", text(focus, "locationId")]]} />
                    <KeyValues rows={[["Custodian", text(focus, "accountableId")], ["Status", <StatusBadge key="s" status={String(focus.status)} />], ["Depreciation Method", text(focus, "depreciationMethod")], ["Useful Life (Years)", text(focus, "usefulLife")], ["Book Value", formatCurrency(plan.bookValue)]]} />
                  </div>
                </FormBlock>
                <FormBlock title="Quick Actions" icon={CheckCircle2}>
                  <div className="grid gap-2">
                    <Button variant="outline" onClick={() => router.push(`/forms/property-card?propertyId=${focus.id}`)} leftIcon={<ClipboardList className="h-4 w-4" />}>View Property Card</Button>
                    <Button variant="outline" onClick={() => router.push(`/property/transactions?property=${encodeURIComponent(String(focus.propertyNo))}`)} leftIcon={<History className="h-4 w-4" />}>View Transaction History</Button>
                    <Button variant="outline" onClick={() => router.push(`/forms/property-card?propertyId=${focus.id}&print=1`)} leftIcon={<Printer className="h-4 w-4" />}>Print Property Card</Button>
                  </div>
                </FormBlock>
              </div>
            )}
          </div>
        </Card>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Property Management"
        description="Manage, track, and maintain non-expendable assets (equipment, furniture, IT assets, vehicles, and other properties)."
        actions={
          <>
            <Button variant="outline" onClick={exportRows} leftIcon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
          </>
        }
      />
      <StatGrid columns={5}>
        <StatCard label="Total Properties" value={formatNumber(all.length)} icon={Landmark} accent="blue" loading={isLoading} />
        <StatCard label="In Service" value={formatNumber(count((row) => row.status === "available" || row.status === "assigned"))} icon={CheckCircle2} accent="green" loading={isLoading} />
        <StatCard label="For Maintenance" value={formatNumber(count((row) => row.status === "for-maintenance"))} icon={Wrench} accent="yellow" loading={isLoading} />
        <StatCard label="Unserviceable" value={formatNumber(count((row) => row.condition === "Unserviceable"))} icon={XCircle} accent="pink" loading={isLoading} />
        <StatCard label="Transferred / Disposed" value={formatNumber(count((row) => ["transferred", "disposed", "lost"].includes(String(row.status))))} icon={ArrowLeftRight} accent="purple" loading={isLoading} />
      </StatGrid>
      <Card className="mb-4">
        <nav aria-label="Property Management sections" className="flex flex-wrap gap-1 border-b border-line px-4">
          {MODULE_TABS.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/property";
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-semibold", active ? "border-brand-600 text-brand-600" : "border-transparent text-slate-600 hover:text-ink")}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4">{filtersBar}</div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[2.2fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-[15px] font-bold">Property List ({formatNumber(rows.length)})</h2>
            <div className="flex flex-wrap gap-2">{toolbarButtons}</div>
          </div>
          {table}
          <SimplePager page={page} total={rows.length} onPage={setPage} />
        </Card>
        <FormBlock title="Property Details" icon={Eye}>
          <PropertyDetailsPanel record={focus} onEdit={canManage && focus ? () => setForm({ open: true, record: focus }) : undefined} />
        </FormBlock>
      </div>
      {dialogs}
    </>
  );
}
