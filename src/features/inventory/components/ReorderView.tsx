"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Calculator, ChevronDown, ClipboardList, Coins, Download, FileSpreadsheet, FilePlus2, Printer, RefreshCw, Search, Settings2, ShoppingCart, Truck, PackagePlus } from "lucide-react";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormBlock } from "@/components/forms/HField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { categoryTone } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useGetDocumentsQuery, useSaveDocumentMutation } from "@/services/api/endpoints/documentsApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetPurchaseOrdersQuery } from "@/services/api/endpoints/purchaseOrdersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import type { Product } from "@/types/models";
import { DocLink, DocStatus, TotalAmount } from "@/features/documents/components/parts";
import { getDocumentDef } from "@/config/documents";

type Tab = "suggestions" | "requests" | "orders" | "settings";
const REORDER_STATUS = [
  { label: "For Reorder", value: "low-stock" },
  { label: "Out of Stock", value: "out-of-stock" },
];

/** Suggested quantity: enough to reach the maximum stock, at least the reorder quantity. */
function suggestedQty(product: Product) {
  const onHand = product.totalStock ?? 0;
  return Math.max(product.reorderQuantity, (product.maxStock ?? 0) - onHand);
}

/** "Reorder Management" screen (mockup p40). */
export function ReorderView() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppSelector(selectCurrentUser);
  const [tab, setTab] = useState<Tab>("suggestions");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const { data: productData, isLoading } = useGetProductsQuery({ pageSize: 1000, sortBy: "sku", warehouseId: filters.warehouseId || undefined });
  const { data: categories } = useGetCategoriesQuery();
  const { data: warehouses } = useGetWarehousesQuery({ pageSize: 100 });
  const { data: prs } = useGetDocumentsQuery({ type: "purchase-requests", params: { pageSize: 500, sortBy: "date", sortOrder: "desc" } });
  const { data: orders } = useGetPurchaseOrdersQuery({ pageSize: 200, sortBy: "orderDate", sortOrder: "desc" });
  const [saveDocument, { isLoading: saving }] = useSaveDocumentMutation();
  const prDef = getDocumentDef("purchase-requests");

  const all = useMemo(() => (productData?.data ?? []).filter((item) => item.status === "active" && (item.stockStatus === "low-stock" || item.stockStatus === "out-of-stock")), [productData]);
  const rows = all.filter(
    (item) =>
      (!filters.categoryId || item.categoryId === filters.categoryId) &&
      (!filters.status || item.stockStatus === filters.status) &&
      (!search || `${item.sku} ${item.name}`.toLowerCase().includes(search.toLowerCase())),
  );
  const qty = (item: Product) => quantities[item.id] ?? suggestedQty(item);
  const chosen = rows.filter((item) => selected.has(item.id));
  const focus = rows.find((item) => item.id === focusId) ?? chosen[0] ?? rows[0];
  const openPr = (prs?.data ?? []).filter((doc) => doc.status === "pending" || doc.status === "draft").length;
  const forDelivery = (orders?.data ?? []).filter((order) => order.status === "approved" || order.status === "partially-received").length;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const itemsFor = (list: Product[]) => list.map((item) => ({ refId: item.id, quantity: qty(item), unitCost: item.unitCost }));

  const generatePr = async () => {
    if (!chosen.length) return toast.error("Select items first", "Tick the items to include in the purchase request.");
    const required = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    try {
      const saved = await saveDocument({
        type: "purchase-requests",
        body: {
          date: todayISO(),
          submit: false,
          remarks: "Replenishment of items below reorder level.",
          fields: {
            department: "Supply and Property Office",
            prType: "Reorder PR",
            costCenter: "ADM-001 – General Administration",
            procurementMode: "Shopping",
            projectCode: null,
            priority: chosen.some((item) => item.stockStatus === "out-of-stock") ? "High" : "Normal",
            requiredDate: required,
            warehouseId: filters.warehouseId || warehouses?.data[0]?.id || null,
            requestedBy: user?.name ?? "Supply Officer",
            position: null,
            contactNo: null,
            email: user?.email ?? null,
          },
          items: itemsFor(chosen),
        },
      }).unwrap();
      toast.success("Purchase request created", `${saved.number} is ready to review and submit.`);
      router.push(`/documents/purchase-requests/${saved.id}/edit`);
    } catch (error) {
      toast.error("Could not create the purchase request", error);
    }
  };

  const addToDraft = async () => {
    const target = (prs?.data ?? []).find((doc) => doc.status === "draft");
    if (!target) return generatePr();
    if (!chosen.length) return toast.error("Select items first", "Tick the items to add to the draft PR.");
    const merged = [...target.items.filter((line) => !chosen.some((item) => item.id === line.refId)), ...itemsFor(chosen)];
    try {
      await saveDocument({
        type: "purchase-requests",
        id: target.id,
        body: { date: target.date, submit: false, remarks: target.remarks, attachments: target.attachments, fields: target.fields, items: merged.map((line) => ({ refId: line.refId, quantity: line.quantity, unitCost: line.unitCost })) },
      }).unwrap();
      toast.success("Added to draft PR", `${chosen.length} item(s) added to ${target.number}.`);
      router.push(`/documents/purchase-requests/${target.id}/edit`);
    } catch (error) {
      toast.error("Could not update the draft PR", error);
    }
  };

  const exportRows = () => {
    exportToCsv("reorder-suggestions", rows, [
      { header: "Item Code", value: (row) => row.sku },
      { header: "Item Description", value: (row) => row.name },
      { header: "Category", value: (row) => row.categoryName },
      { header: "On Hand", value: (row) => row.totalStock },
      { header: "Reorder Level", value: (row) => row.reorderLevel },
      { header: "Reorder Qty", value: (row) => row.reorderQuantity },
      { header: "Suggested Order Qty", value: (row) => qty(row) },
      { header: "Estimated Cost", value: (row) => qty(row) * row.unitCost },
    ]);
    toast.success("Export ready", `${rows.length} suggestions exported.`);
  };

  const cell = "px-3 py-2.5";
  const head = "bg-[#f3f4f6] text-left text-xs font-bold text-ink";

  return (
    <>
      <PageHeader
        icon={RefreshCw}
        title="Reorder Management"
        description="Monitor items below reorder level, generate purchase requests, and track replenishment."
        actions={
          <>
            <Can permission={PERMISSIONS.inventoryAdjust}>
              <ButtonLink href="/documents/purchase-requests/new" leftIcon={<FilePlus2 className="h-4 w-4" />}>Create PR</ButtonLink>
            </Can>
            <Dropdown
              trigger={(props) => (
                <Button {...props} variant="outline" leftIcon={<Download className="h-4 w-4" />}>
                  Export <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              )}
            >
              {(close) => <DropdownItem onClick={() => { close(); exportRows(); }}><FileSpreadsheet className="h-4 w-4" /> Excel (.csv)</DropdownItem>}
            </Dropdown>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
          </>
        }
      />
      <StatGrid columns={5}>
        <StatCard label="Items for Reorder" value={formatNumber(all.length)} icon={Box} accent="blue" loading={isLoading} />
        <StatCard label="Total Reorder Qty" value={formatNumber(all.reduce((sum, item) => sum + qty(item), 0))} icon={PackagePlus} accent="green" loading={isLoading} />
        <StatCard label="Estimated Cost" value={formatCurrency(all.reduce((sum, item) => sum + qty(item) * item.unitCost, 0))} icon={Coins} accent="yellow" loading={isLoading} />
        <StatCard label="Open PR" value={formatNumber(openPr)} icon={ClipboardList} accent="pink" loading={!prs} />
        <StatCard label="For Delivery (PO)" value={formatNumber(forDelivery)} icon={Truck} accent="purple" loading={!orders} />
      </StatGrid>
      <Card className="mb-4">
        <Tabs
          label="Reorder views"
          className="px-4"
          value={tab}
          onChange={setTab}
          items={[
            { value: "suggestions", label: "Reorder Suggestions", icon: RefreshCw },
            { value: "requests", label: "Reorder Requests (PR)", icon: ClipboardList },
            { value: "orders", label: "Purchase Orders (PO)", icon: ShoppingCart },
            { value: "settings", label: "Reorder Settings", icon: Settings2 },
          ]}
        />
        {tab === "requests" && prDef && (
          <table className="w-full text-[13px]">
            <thead><tr className={head}><th className={cell}>PR No.</th><th className={cell}>PR Date</th><th className={cell}>Department</th><th className={cell}>Priority</th><th className={cn(cell, "text-right")}>No. of Items</th><th className={cn(cell, "text-right")}>Estimated Amount</th><th className={cell}>Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {(prs?.data ?? []).slice(0, 15).map((doc) => (
                <tr key={doc.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/documents/purchase-requests/${doc.id}`)}>
                  <td className={cell}><DocLink href={`/documents/purchase-requests/${doc.id}`}>{doc.number}</DocLink></td>
                  <td className={cell}>{formatDate(doc.date)}</td>
                  <td className={cell}>{String(doc.fields.department ?? "—")}</td>
                  <td className={cell}><Badge tone={String(doc.fields.priority).startsWith("High") || String(doc.fields.priority).startsWith("Urgent") ? "danger" : "warning"}>{String(doc.fields.priority ?? "—")}</Badge></td>
                  <td className={cn(cell, "text-right")}>{doc.items.length}</td>
                  <td className={cn(cell, "text-right")}>{formatCurrency(doc.totalAmount ?? 0)}</td>
                  <td className={cell}><DocStatus def={prDef} doc={doc} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "orders" && (
          <table className="w-full text-[13px]">
            <thead><tr className={head}><th className={cell}>PO No.</th><th className={cell}>Supplier</th><th className={cell}>Order Date</th><th className={cell}>Expected Delivery</th><th className={cn(cell, "text-right")}>Items</th><th className={cn(cell, "text-right")}>Total</th><th className={cell}>Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {(orders?.data ?? []).slice(0, 15).map((order) => (
                <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/purchase-orders/${order.id}`)}>
                  <td className={cell}><DocLink href={`/purchase-orders/${order.id}`}>{order.poNumber}</DocLink></td>
                  <td className={cell}>{order.supplierName}</td>
                  <td className={cell}>{formatDate(order.orderDate)}</td>
                  <td className={cell}>{formatDate(order.expectedDate)}</td>
                  <td className={cn(cell, "text-right")}>{order.itemCount}</td>
                  <td className={cn(cell, "text-right")}>{formatCurrency(order.total ?? 0)}</td>
                  <td className={cell}><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(tab === "suggestions" || tab === "settings") && (
          <>
            <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex min-w-64 flex-1 flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">Search</span>
                <SearchInput value={search} onChange={setSearch} placeholder="Search by item code or description..." label="Search reorder items" />
              </div>
              <FilterSelect layout="stacked" label="Warehouse" allLabel="All Warehouses" value={draft.warehouseId ?? filters.warehouseId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, warehouseId: value }))} options={(warehouses?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id }))} />
              <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.categoryId ?? filters.categoryId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
              <FilterSelect layout="stacked" label="Reorder Status" allLabel="All Status" value={draft.status ?? filters.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={REORDER_STATUS} />
              <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => setFilters((current) => ({ ...current, ...draft }))}>Search</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-[13px]">
                <thead>
                  <tr className={head}>
                    {tab === "suggestions" && (
                      <th className="w-10 px-4 py-2.5">
                        <input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-brand-600" checked={rows.length > 0 && chosen.length === rows.length} onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((item) => item.id)) : new Set())} />
                      </th>
                    )}
                    <th className={cell}>#</th><th className={cell}>Item Code</th><th className={cell}>Item Description</th><th className={cell}>Category</th><th className={cell}>UoM</th>
                    <th className={cn(cell, "text-right")}>On Hand</th><th className={cn(cell, "text-right")}>Reorder Level</th><th className={cn(cell, "text-right")}>Reorder Qty</th>
                    {tab === "suggestions" ? (
                      <><th className={cn(cell, "w-32 text-right")}>Suggested Order Qty</th><th className={cn(cell, "text-right")}>Estimated Cost</th><th className={cell}>Reorder Status</th></>
                    ) : (
                      <><th className={cn(cell, "text-right")}>Minimum Stock</th><th className={cn(cell, "text-right")}>Maximum Stock</th><th className={cell}>Preferred Supplier</th><th className={cell}>Actions</th></>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((item, index) => (
                    <tr key={item.id} onClick={() => setFocusId(item.id)} className={cn("cursor-pointer", focus?.id === item.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
                      {tab === "suggestions" && (
                        <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${item.sku}`} className="h-4 w-4 accent-brand-600" checked={selected.has(item.id)} onChange={(event) => toggle(item.id, event.target.checked)} />
                        </td>
                      )}
                      <td className={cn(cell, "text-slate-500")}>{index + 1}</td>
                      <td className={cell}><DocLink href={`/products/${item.id}`}>{item.sku}</DocLink></td>
                      <td className={cell}>{item.name}</td>
                      <td className={cell}><Badge tone={categoryTone(item.categoryName)}>{item.categoryName}</Badge></td>
                      <td className={cell}>{item.unit}</td>
                      <td className={cn(cell, "text-right font-semibold text-[#1a7f46]")}>{formatNumber(item.totalStock ?? 0)}</td>
                      <td className={cn(cell, "text-right")}>{formatNumber(item.reorderLevel)}</td>
                      <td className={cn(cell, "text-right")}>{formatNumber(item.reorderQuantity)}</td>
                      {tab === "suggestions" ? (
                        <>
                          <td className="px-3 py-1.5" onClick={(event) => event.stopPropagation()}>
                            <Input type="number" min={1} aria-label={`Suggested order quantity for ${item.sku}`} className="h-8 text-right" value={qty(item)} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(1, Number(event.target.value) || 1) }))} />
                          </td>
                          <td className={cn(cell, "text-right font-semibold")}>{formatCurrency(qty(item) * item.unitCost)}</td>
                          <td className={cell}><Badge tone={item.stockStatus === "out-of-stock" ? "danger" : "warning"}>{item.stockStatus === "out-of-stock" ? "Out of Stock" : "For Reorder"}</Badge></td>
                        </>
                      ) : (
                        <>
                          <td className={cn(cell, "text-right")}>{formatNumber(item.minStock ?? 0)}</td>
                          <td className={cn(cell, "text-right")}>{formatNumber(item.maxStock ?? 0)}</td>
                          <td className={cell}>{item.supplierName ?? "—"}</td>
                          <td className={cell}><button type="button" className="font-semibold text-[#2f6fd6] hover:underline" onClick={() => router.push(`/products/${item.id}/edit`)}>Edit</button></td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-500">{isLoading ? "Loading…" : "No items are below their reorder level."}</td></tr>}
                </tbody>
              </table>
            </div>
            {tab === "suggestions" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-slate-50 px-4 py-3 text-[13px]">
                <span>Select All ({rows.length}) · Selected: <b>{chosen.length}</b></span>
                <span className="flex gap-6">
                  <span>Total Suggested Qty: <b>{formatNumber(chosen.reduce((sum, item) => sum + qty(item), 0))}</b></span>
                  <span>Total Estimated Cost: <b className="text-brand-600">{formatCurrency(chosen.reduce((sum, item) => sum + qty(item) * item.unitCost, 0))}</b></span>
                </span>
              </div>
            )}
          </>
        )}
      </Card>
      {tab === "suggestions" && focus && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormBlock title="Item Details" icon={Box}>
              <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
                {[
                  ["Item Code", focus.sku],
                  ["Item Description", focus.name],
                  ["Category", focus.categoryName],
                  ["UoM", focus.unit],
                  ["Unit Cost", formatCurrency(focus.unitCost)],
                  ["Preferred Supplier", focus.supplierName ?? "—"],
                ].map(([label, value]) => (
                  <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>
                ))}
              </dl>
            </FormBlock>
            <FormBlock title="Reorder Computation" icon={Calculator}>
              <dl className="space-y-1.5 text-[13px]">
                {[
                  ["On Hand", focus.totalStock ?? 0],
                  ["Reserved", focus.reservedStock ?? 0],
                  ["Available", Math.max(0, (focus.totalStock ?? 0) - (focus.reservedStock ?? 0))],
                  ["Reorder Level", focus.reorderLevel],
                  ["Reorder Qty (Shortage)", Math.max(0, focus.reorderLevel - (focus.totalStock ?? 0))],
                  ["Suggested Order Qty", qty(focus)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between"><dt className="text-slate-600">{label}</dt><dd className="font-bold">{formatNumber(Number(value))}</dd></div>
                ))}
              </dl>
              <TotalAmount label="Estimated Cost" value={formatCurrency(qty(focus) * focus.unitCost)} />
            </FormBlock>
          </div>
          <Can permission={PERMISSIONS.inventoryAdjust}>
            <div className="mt-4 flex flex-wrap justify-end gap-2 rounded-lg border border-line bg-white px-4 py-3">
              <Button variant="outline" onClick={() => router.push("/documents/purchase-requests/new")} leftIcon={<FilePlus2 className="h-4 w-4" />}>Create Purchase Request (PR)</Button>
              <Button variant="outline" onClick={addToDraft} disabled={saving} leftIcon={<ClipboardList className="h-4 w-4" />}>Add to Draft PR</Button>
              <Button onClick={generatePr} loading={saving} leftIcon={<ShoppingCart className="h-4 w-4" />}>Generate PR</Button>
            </div>
          </Can>
        </>
      )}
    </>
  );
}
