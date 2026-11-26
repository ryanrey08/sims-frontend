"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, CheckCircle2, ChevronDown, Copy, Download, Eye, FileSpreadsheet, LayoutGrid, List, Pencil, Plus, RefreshCw, Ruler, Search, Tag, Trash2, Upload, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { RowActions } from "@/components/tables/RowActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Tabs } from "@/components/ui/Tabs";
import { ITEM_TYPES, ITEM_TYPE_OPTIONS, PRODUCT_STATUS_OPTIONS, categoryTone } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useListState } from "@/hooks/useListState";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { exportToCsv, pickCsvFile } from "@/lib/utils/csv";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useCreateProductMutation, useDeleteProductMutation, useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import type { Product } from "@/types/models";
import { DocLink } from "@/features/documents/components/parts";

type Tab = "list" | "types" | "reorder";

/** "Item Master" screen (mockup p37). */
function ItemMaster() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.productsManage);
  const [tab, setTab] = useState<Tab>("list");
  const list = useListState({ sortBy: "sku", filters: { stockStatus: searchParams.get("stockStatus") ?? "", categoryId: searchParams.get("categoryId") ?? "" } });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery(list.params);
  const { data: all } = useGetProductsQuery({ pageSize: 1000 });
  const { data: categories } = useGetCategoriesQuery();
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const items = useMemo(() => all?.data ?? [], [all]);
  const active = items.filter((item) => item.status === "active").length;

  const columns: Column<Product>[] = [
    { key: "index", header: "#", cell: (row) => <span className="text-slate-500">{((data?.meta.page ?? 1) - 1) * (data?.meta.pageSize ?? 10) + (data?.data.indexOf(row) ?? 0) + 1}</span> },
    { key: "sku", header: "Item Code", sortable: true, cell: (row) => <DocLink href={`/products/${row.id}`}>{row.sku}</DocLink> },
    { key: "name", header: "Item Description", sortable: true, cell: (row) => <span className="line-clamp-2 min-w-44">{row.name}</span> },
    { key: "categoryName", header: "Category", hideOnMobile: true, cell: (row) => <Badge tone={categoryTone(row.categoryName)}>{row.categoryName}</Badge> },
    { key: "itemType", header: "Item Type", hideOnMobile: true, cell: (row) => <span className="whitespace-nowrap">{row.itemType ?? "—"}</span> },
    { key: "unit", header: "UoM", hideOnMobile: true, cell: (row) => row.unit },
    { key: "reorderLevel", header: "Reorder Level", sortable: true, align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reorderLevel) },
    { key: "reorderQuantity", header: "Reorder Qty", align: "right", hideOnMobile: true, cell: (row) => formatNumber(row.reorderQuantity) },
    { key: "unitCost", header: "Unit Cost", sortable: true, align: "right", cell: (row) => formatCurrency(row.unitCost) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      hideOnMobile: true,
      cell: (row) => (
        <RowActions
          label={row.name}
          actions={[
            { label: "View", icon: Eye, inline: true, onSelect: () => router.push(`/products/${row.id}`) },
            { label: "Edit", icon: Pencil, inline: true, onSelect: () => router.push(`/products/${row.id}/edit`), hidden: !canManage },
            { label: "Duplicate", icon: Copy, inline: true, onSelect: () => router.push(`/products/new?copy=${row.id}`), hidden: !canManage },
            { label: "Delete", icon: Trash2, inline: true, danger: true, onSelect: () => setToDelete(row), hidden: !canManage },
          ]}
        />
      ),
    },
  ];

  const exportRows = (format: "csv" | "excel") => {
    exportToCsv(`item-master-${new Date().toISOString().slice(0, 10)}`, items, [
      { header: "Item Code", value: (row) => row.sku },
      { header: "Item Description", value: (row) => row.name },
      { header: "Category", value: (row) => row.categoryName },
      { header: "Item Type", value: (row) => row.itemType },
      { header: "UoM", value: (row) => row.unit },
      { header: "Reorder Level", value: (row) => row.reorderLevel },
      { header: "Reorder Qty", value: (row) => row.reorderQuantity },
      { header: "Unit Cost", value: (row) => row.unitCost },
      { header: "Status", value: (row) => (row.status === "active" ? "Active" : "Inactive") },
    ]);
    toast.success("Export ready", `${items.length} items exported${format === "excel" ? " (CSV opens in Excel)" : ""}.`);
  };

  const importRows = async () => {
    try {
      const rows = await pickCsvFile();
      if (!rows.length) return;
      const categoryByName = new Map((categories?.data ?? []).map((item) => [item.name.toLowerCase(), item.id]));
      let created = 0;
      for (const row of rows) {
        try {
          await createProduct({
            sku: (row.itemcode ?? row.sku ?? "").toUpperCase(),
            name: row.itemdescription ?? row.name ?? "",
            description: row.itemdescription ?? row.name ?? "",
            categoryId: categoryByName.get((row.category ?? "").toLowerCase()) ?? "",
            unit: row.uom ?? row.unit ?? "pcs",
            unitCost: Number(row.unitcost ?? 0),
            reorderLevel: Number(row.reorderlevel ?? 0),
            reorderQuantity: Number(row.reorderqty ?? 1) || 1,
            itemType: row.itemtype || "Consumable",
            preferredSupplierId: null,
            status: (row.status ?? "").toLowerCase() === "inactive" ? "discontinued" : "active",
          }).unwrap();
          created += 1;
        } catch {
          // Invalid rows are skipped and counted below.
        }
      }
      toast.success("Import complete", `${created} of ${rows.length} items imported.`);
    } catch (importError) {
      toast.error("Could not read the file", importError);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id).unwrap();
      toast.success("Item deleted", toDelete.name);
    } catch (deleteError) {
      toast.error("Could not delete item", deleteError);
    }
    setToDelete(null);
  };

  return (
    <>
      <PageHeader
        icon={Box}
        title="Item Master"
        description="Maintain the master list of inventory items, including item details, classification, unit of measure, and stock controls."
        actions={
          <>
            <Can permission={PERMISSIONS.productsManage}>
              <ButtonLink href="/products/new" leftIcon={<Plus className="h-4 w-4" />}>New Item</ButtonLink>
              <Button variant="outline" onClick={importRows} leftIcon={<Upload className="h-4 w-4" />}>Import</Button>
            </Can>
            <Dropdown
              trigger={(props) => (
                <Button {...props} variant="outline" leftIcon={<Download className="h-4 w-4" />} disabled={!items.length}>
                  Export <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  <DropdownItem onClick={() => { close(); exportRows("excel"); }}><FileSpreadsheet className="h-4 w-4" /> Excel (.csv)</DropdownItem>
                  <DropdownItem onClick={() => { close(); window.print(); }}><Download className="h-4 w-4" /> PDF (print)</DropdownItem>
                </>
              )}
            </Dropdown>
          </>
        }
      />
      <StatGrid columns={5}>
        <StatCard label="Total Items" value={formatNumber(items.length)} icon={Box} accent="blue" loading={!all} />
        <StatCard label="Active Items" value={formatNumber(active)} icon={CheckCircle2} accent="green" loading={!all} />
        <StatCard label="Inactive Items" value={formatNumber(items.length - active)} icon={XCircle} accent="yellow" loading={!all} />
        <StatCard label="Item Categories" value={formatNumber(categories?.data.length ?? 0)} icon={LayoutGrid} accent="purple" loading={!categories} />
        <StatCard label="Item Types" value={ITEM_TYPES.length} icon={Tag} accent="pink" />
      </StatGrid>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4">
          <Tabs
            label="Item master views"
            className="border-b-0"
            value={tab}
            onChange={setTab}
            items={[
              { value: "list", label: "Item List", icon: List },
              { value: "types", label: "Item Types", icon: Tag },
              { value: "reorder", label: "Reorder Settings", icon: RefreshCw },
            ]}
          />
          <nav aria-label="Related registries" className="flex gap-4 pb-2.5 text-[13px] font-semibold text-slate-600">
            <Link href="/masters/units" className="flex items-center gap-1.5 hover:text-brand-600"><Ruler className="h-4 w-4" />UoM</Link>
            <Link href="/categories" className="flex items-center gap-1.5 hover:text-brand-600"><LayoutGrid className="h-4 w-4" />Categories</Link>
          </nav>
        </div>
        {tab === "types" ? (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#f3f4f6] text-left text-xs font-bold"><th className="px-4 py-2.5">Item Type</th><th className="px-3 py-2.5 text-right">Items</th><th className="px-3 py-2.5 text-right">Active</th><th className="px-4 py-2.5" /></tr></thead>
            <tbody className="divide-y divide-line">
              {ITEM_TYPES.map((type) => {
                const ofType = items.filter((item) => (item.itemType ?? "Consumable") === type);
                return (
                  <tr key={type}>
                    <td className="px-4 py-2.5 font-semibold">{type}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(ofType.length)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(ofType.filter((item) => item.status === "active").length)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" className="text-[13px] font-semibold text-[#2f6fd6] hover:underline" onClick={() => { list.setFilter("itemType", type); setTab("list"); }}>View items</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <>
            <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex min-w-64 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">Search</span>
                <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search by item code, description, or barcode..." label="Search items" />
              </div>
              <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.categoryId ?? list.filters.categoryId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
              <FilterSelect layout="stacked" label="Item Type" allLabel="All Types" value={draft.itemType ?? list.filters.itemType ?? ""} onChange={(value) => setDraft((current) => ({ ...current, itemType: value }))} options={ITEM_TYPE_OPTIONS} />
              <FilterSelect layout="stacked" label="Status" allLabel="All Statuses" value={draft.status ?? list.filters.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={PRODUCT_STATUS_OPTIONS} />
              <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => Object.entries(draft).forEach(([key, value]) => list.setFilter(key, value))}>Search</Button>
              {list.hasActiveFilters && <Button variant="ghost" onClick={() => { setDraft({}); list.resetFilters(); }}>Reset</Button>}
            </div>
            <DataTable
              caption="Item master"
              columns={
                tab === "reorder"
                  ? [
                      columns[1],
                      columns[2],
                      columns[5],
                      { key: "totalStock", header: "On Hand", align: "right", cell: (row) => formatNumber(row.totalStock ?? 0) },
                      { key: "minStock", header: "Minimum Stock", align: "right", cell: (row) => formatNumber(row.minStock ?? 0) },
                      columns[6],
                      columns[7],
                      { key: "maxStock", header: "Maximum Stock", align: "right", cell: (row) => formatNumber(row.maxStock ?? 0) },
                      { key: "stockStatus", header: "Stock Status", cell: (row) => <StatusBadge status={row.stockStatus} /> },
                      { key: "edit", header: "Actions", align: "center", cell: (row) => <RowActions label={row.name} actions={[{ label: "Edit reorder settings", icon: Pencil, inline: true, onSelect: () => router.push(`/products/${row.id}/edit`), hidden: !canManage }]} /> },
                    ]
                  : columns
              }
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
              onRowClick={(row) => router.push(`/products/${row.id}`)}
              mobileTitleKey="name"
              empty={<EmptyState title="No items found" description={list.hasActiveFilters ? "Try a different search or clear the filters." : "Add your first item to get started."} />}
            />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete item?"
        description={toDelete && `Delete ${toDelete.name} (${toDelete.sku})? Items with stock history cannot be deleted; set them to Inactive instead.`}
        confirmLabel="Delete item"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

export function ProductsListView() {
  return (
    <Suspense>
      <ItemMaster />
    </Suspense>
  );
}
