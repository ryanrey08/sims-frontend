"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Boxes, Download, Eye, FileBarChart, FileSpreadsheet, FileText, Landmark, Printer, Save, Settings2, Trash2, Wrench } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { FormBlock } from "@/components/forms/HField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { PROPERTY_CATEGORIES } from "@/config/masterData";
import { REPORT_FORMS } from "@/config/reportForms";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatDateTime, formatNumber, todayISO } from "@/lib/utils/format";
import { useGetDocumentsQuery } from "@/services/api/endpoints/documentsApi";
import { useDeleteMasterRecordMutation, useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetStockLevelsQuery } from "@/services/api/endpoints/inventoryApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import type { MasterRecord, TransactionDocument } from "@/types/records";
import type { Product, StockLevel } from "@/types/models";
import { cell, head } from "./shared";

type Hub = "property" | "inventory" | "maintenance" | "disposal" | "custom";
type Row = Record<string, string | number>;
interface Built { columns: { key: string; label: string; money?: boolean; number?: boolean }[]; rows: Row[] }
interface Filters { asOf: string; from: string; to: string; category: string; location: string; status: string }
interface Data { properties: MasterRecord[]; workOrders: MasterRecord[]; products: Product[]; levels: StockLevel[]; codes: MasterRecord[]; disposals: TransactionDocument[] }
interface ReportCard { key: string; title: string; description: string; build: (data: Data, filters: Filters) => Built }

const money = (key: string, label: string) => ({ key, label, money: true });
const num = (key: string, label: string) => ({ key, label, number: true });
const col = (key: string, label: string) => ({ key, label });

/** Groups records and totals a value (count + amount) for the "by …" reports. */
function groupBy<T>(items: T[], key: (item: T) => string, amount: (item: T) => number, label: string): Built {
  const map = new Map<string, { count: number; total: number }>();
  items.forEach((item) => {
    const group = key(item) || "—";
    const entry = map.get(group) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += amount(item);
    map.set(group, entry);
  });
  return { columns: [col("group", label), num("count", "Count"), money("total", "Total Amount")], rows: [...map.entries()].map(([group, value]) => ({ group, count: value.count, total: value.total })).sort((a, b) => b.total - a.total) };
}

const propertyFilter = (items: MasterRecord[], filters: Filters) =>
  items.filter((item) => (!filters.category || item.category === filters.category) && (!filters.location || item.locationId === filters.location) && (!filters.status || item.status === filters.status) && (!filters.asOf || String(item.acquisitionDate ?? "") <= filters.asOf));
const cost = (item: MasterRecord) => Number(item.acquisitionCost ?? 0);
const label = (item: MasterRecord, field: string) => String(item[`${field}__label`] ?? item[field] ?? "—");

const HUBS: Record<Exclude<Hub, "custom">, { title: string; icon: typeof Landmark; categories: string[]; formGroups: string[]; cards: ReportCard[] }> = {
  property: {
    title: "Property",
    icon: Landmark,
    categories: ["Property Master Reports", "Property Status Reports", "Property Valuation Reports", "Property Transaction Reports", "Depreciation Reports", "Property Movement Reports", "Custodian Reports", "Disposal Reports", "Audit & Compliance Reports"],
    formGroups: ["Property Management"],
    cards: [
      { key: "property-master-list", title: "Property Master List", description: "Complete list of registered properties.", build: (data, filters) => ({ columns: [col("propertyNo", "Property No."), col("description", "Description"), col("category", "Category"), col("serialNo", "Serial No."), col("acquired", "Acquisition Date"), money("cost", "Acquisition Cost"), col("location", "Location"), col("status", "Status")], rows: propertyFilter(data.properties, filters).map((item) => ({ propertyNo: String(item.propertyNo), description: String(item.description), category: String(item.category ?? "—"), serialNo: String(item.serialNo ?? "—"), acquired: formatDate(String(item.acquisitionDate ?? "")), cost: cost(item), location: label(item, "locationId"), status: String(item.status) })) }) },
      { key: "property-by-category", title: "Property by Category", description: "Count and cost per property category.", build: (data, filters) => groupBy(propertyFilter(data.properties, filters), (item) => String(item.category ?? ""), cost, "Category") },
      { key: "property-by-location", title: "Property by Location", description: "Properties grouped by storage location.", build: (data, filters) => groupBy(propertyFilter(data.properties, filters), (item) => label(item, "locationId"), cost, "Location") },
      { key: "property-by-custodian", title: "Property by Custodian", description: "Accountability per custodian.", build: (data, filters) => groupBy(propertyFilter(data.properties, filters), (item) => label(item, "accountableId"), cost, "Custodian") },
      { key: "property-by-condition", title: "Property by Condition", description: "Serviceable, for repair and unserviceable.", build: (data, filters) => groupBy(propertyFilter(data.properties, filters), (item) => String(item.condition ?? ""), cost, "Condition") },
      { key: "property-summary", title: "Property Summary", description: "Totals per status.", build: (data, filters) => groupBy(propertyFilter(data.properties, filters), (item) => String(item.status ?? ""), cost, "Status") },
    ],
  },
  inventory: {
    title: "Inventory",
    icon: Boxes,
    categories: ["Inventory Master Reports", "Inventory Stock Reports", "Inventory Movement Reports", "Receiving (GRN) Reports", "Issuance (RIS/ICS/PAR) Reports", "Stock Transfer Reports", "Physical Count Reports", "Reorder & Aging Reports", "Inventory Valuation Reports", "Expiry & Batch Reports", "Audit & Compliance Reports"],
    formGroups: ["Inventory Management", "Inventory Monitoring", "Inventory Transactions"],
    cards: [
      { key: "item-master-list", title: "Item Master List", description: "All inventory items with cost and reorder levels.", build: (data) => ({ columns: [col("sku", "Item Code"), col("name", "Item Description"), col("category", "Category"), col("unit", "UoM"), money("unitCost", "Unit Cost"), num("reorder", "Reorder Level"), num("onHand", "On Hand")], rows: data.products.map((item) => ({ sku: item.sku, name: item.name, category: item.categoryName ?? "—", unit: item.unit, unitCost: item.unitCost, reorder: item.reorderLevel, onHand: item.totalStock ?? 0 })) }) },
      { key: "items-by-category", title: "Items by Category", description: "Stock value per category.", build: (data) => groupBy(data.products, (item) => item.categoryName ?? "", (item) => item.stockValue ?? 0, "Category") },
      { key: "items-by-warehouse", title: "Items by Warehouse", description: "Stock value per warehouse.", build: (data) => groupBy(data.levels, (level) => level.warehouseName ?? "", (level) => level.value ?? 0, "Warehouse") },
      { key: "items-with-codes", title: "Item with Barcode / QR", description: "Items and their generated codes.", build: (data) => ({ columns: [col("sku", "Item Code"), col("name", "Item Description"), col("barcode", "Barcode"), col("qr", "QR Code")], rows: data.products.map((item) => ({ sku: item.sku, name: item.name, barcode: String(data.codes.find((code) => code.productId === item.id && code.codeType === "Barcode")?.code ?? "—"), qr: String(data.codes.find((code) => code.productId === item.id && code.codeType === "QR Code")?.code ?? "—") })) }) },
      { key: "inventory-summary", title: "Inventory Summary", description: "On hand, value and stock status.", build: (data) => groupBy(data.products, (item) => (item.stockStatus === "low-stock" ? "Below Reorder" : item.stockStatus === "out-of-stock" ? "Out of Stock" : "Sufficient"), (item) => item.stockValue ?? 0, "Stock Status") },
      { key: "stock-ageing", title: "Stock Ageing", description: "Days since each stock record last changed.", build: (data) => ({ columns: [col("sku", "Item Code"), col("name", "Item Description"), col("warehouse", "Warehouse"), num("quantity", "On Hand"), num("days", "Days Since Last Movement")], rows: data.levels.filter((level) => level.quantity > 0).map((level) => ({ sku: level.sku ?? "", name: level.productName ?? "", warehouse: level.warehouseName ?? "", quantity: level.quantity, days: Math.floor((Date.now() - new Date(level.updatedAt).getTime()) / 86400000) })).sort((a, b) => b.days - a.days) }) },
    ],
  },
  maintenance: {
    title: "Maintenance",
    icon: Wrench,
    categories: ["Maintenance Asset Reports", "Maintenance Request Reports", "Work Order Reports", "Preventive Maintenance Reports", "Corrective Maintenance Reports", "Maintenance Cost Reports", "Equipment Downtime Reports", "Maintenance Schedule Reports", "Service Provider Reports", "Maintenance Compliance Reports"],
    formGroups: [],
    cards: [
      { key: "maintenance-asset-list", title: "Maintenance Asset List", description: "Properties with maintenance records.", build: (data) => ({ columns: [col("no", "WO / Request No."), col("property", "Property"), col("type", "Type"), col("priority", "Priority"), col("status", "Status"), col("target", "Target Date")], rows: data.workOrders.map((item) => ({ no: String(item.woNo ?? item.requestNo), property: label(item, "propertyId"), type: String(item.type), priority: String(item.priority), status: String(item.status), target: formatDate(String(item.targetDate ?? "")) })) }) },
      { key: "maintenance-by-category", title: "Maintenance by Category", description: "Requests per property category.", build: (data) => groupBy(data.workOrders, (item) => String(data.properties.find((property) => property.id === item.propertyId)?.category ?? ""), (item) => Number(item.laborCost ?? 0) + Number(item.partsCost ?? 0) + Number(item.otherCost ?? 0), "Category") },
      { key: "maintenance-by-location", title: "Maintenance by Location", description: "Requests per property location.", build: (data) => groupBy(data.workOrders, (item) => label(data.properties.find((property) => property.id === item.propertyId) ?? ({} as MasterRecord), "locationId"), (item) => Number(item.laborCost ?? 0) + Number(item.partsCost ?? 0), "Location") },
      { key: "maintenance-schedule", title: "Maintenance Schedule", description: "Open work by target date.", build: (data) => ({ columns: [col("target", "Target Date"), col("no", "WO / Request No."), col("property", "Property"), col("type", "Type"), col("assigned", "Assigned To")], rows: data.workOrders.filter((item) => item.status !== "completed").sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate))).map((item) => ({ target: formatDate(String(item.targetDate ?? "")), no: String(item.woNo ?? item.requestNo), property: label(item, "propertyId"), type: String(item.type), assigned: String(item.assignedTo ?? "—") })) }) },
      { key: "work-order-summary", title: "Work Order Summary", description: "Work orders per status.", build: (data) => groupBy(data.workOrders, (item) => String(item.status), (item) => Number(item.laborCost ?? 0) + Number(item.partsCost ?? 0) + Number(item.otherCost ?? 0), "Status") },
      { key: "maintenance-cost-summary", title: "Maintenance Cost Summary", description: "Labor, parts and other charges.", build: (data) => ({ columns: [col("no", "WO / Request No."), money("labor", "Labor"), money("parts", "Parts"), money("other", "Other"), money("total", "Total")], rows: data.workOrders.map((item) => ({ no: String(item.woNo ?? item.requestNo), labor: Number(item.laborCost ?? 0), parts: Number(item.partsCost ?? 0), other: Number(item.otherCost ?? 0), total: Number(item.laborCost ?? 0) + Number(item.partsCost ?? 0) + Number(item.otherCost ?? 0) })) }) },
    ],
  },
  disposal: {
    title: "Disposal",
    icon: Trash2,
    categories: ["Disposal Master Reports", "Disposal Transaction Reports", "Disposal Status Reports", "Disposal by Category", "Disposal by Location", "Disposal by Period", "Disposal Property by Custodian", "Disposal Value Summary", "Condemnation Reports", "Mode of Disposal Reports", "Audit & Compliance Reports"],
    formGroups: ["Property Management"],
    cards: [
      { key: "disposal-asset-list", title: "Disposal Asset List", description: "Unserviceable, for-disposal and disposed property.", build: (data, filters) => ({ columns: [col("propertyNo", "Property No."), col("description", "Description"), col("category", "Category"), col("condition", "Condition"), money("cost", "Acquisition Cost"), col("status", "Status")], rows: propertyFilter(data.properties, { ...filters, status: "" }).filter((item) => ["for-disposal", "disposed", "lost"].includes(String(item.status)) || item.condition === "Unserviceable").map((item) => ({ propertyNo: String(item.propertyNo), description: String(item.description), category: String(item.category ?? "—"), condition: String(item.condition ?? "—"), cost: cost(item), status: String(item.status) })) }) },
      { key: "disposal-by-category", title: "Disposal by Category", description: "Disposed value per category.", build: (data) => groupBy(data.disposals.flatMap((doc) => doc.items), (item) => String(data.properties.find((property) => property.id === item.refId)?.category ?? ""), (item) => item.unitCost ?? 0, "Category") },
      { key: "disposal-by-location", title: "Disposal by Location", description: "Disposed value per location.", build: (data) => groupBy(data.disposals.flatMap((doc) => doc.items), (item) => label(data.properties.find((property) => property.id === item.refId) ?? ({} as MasterRecord), "locationId"), (item) => item.unitCost ?? 0, "Location") },
      { key: "disposal-by-period", title: "Disposal by Period", description: "Disposals per month.", build: (data, filters) => groupBy(data.disposals.filter((doc) => (!filters.from || doc.date >= filters.from) && (!filters.to || doc.date <= filters.to)), (doc) => doc.date.slice(0, 7), (doc) => doc.totalAmount ?? 0, "Month") },
      { key: "disposal-value-summary", title: "Disposal Value Summary", description: "Book value disposed per status.", build: (data) => groupBy(data.disposals, (doc) => doc.status, (doc) => doc.totalAmount ?? 0, "Status") },
      { key: "mode-of-disposal", title: "Mode of Disposal", description: "Condemnation, sale, transfer, loss.", build: (data) => groupBy(data.disposals, (doc) => String(doc.fields.disposalType ?? ""), (doc) => doc.totalAmount ?? 0, "Mode of Disposal") },
    ],
  },
};

const FILTER_KEY = "sims.reportHub.filters";

/** Report hubs (p85–p88): categories, report cards, generate form and recent reports. */
export function ReportHubView() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppSelector(selectCurrentUser);
  const [hub, setHub] = useState<Hub>("property");
  const [category, setCategory] = useState(0);
  const config = hub === "custom" ? null : HUBS[hub];
  const [reportKey, setReportKey] = useState(HUBS.property.cards[0].key);
  const [filters, setFilters] = useState<Filters>({ asOf: todayISO(), from: `${todayISO().slice(0, 4)}-01-01`, to: todayISO(), category: "", location: "", status: "" });
  const [preview, setPreview] = useState<{ title: string; built: Built; parameters: string } | null>(null);
  const locations = useReferenceOptions("locations");

  const properties = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });
  const workOrders = useGetMasterRecordsQuery({ resource: "work-orders", params: { pageSize: 1000 } });
  const codes = useGetMasterRecordsQuery({ resource: "label-codes", params: { pageSize: 5000 } });
  const reports = useGetMasterRecordsQuery({ resource: "generated-reports", params: { pageSize: 200, sortBy: "generatedAt", sortOrder: "desc" } });
  const products = useGetProductsQuery({ pageSize: 1000 });
  const levels = useGetStockLevelsQuery({ pageSize: 2000 });
  const disposals = useGetDocumentsQuery({ type: "property-disposals", params: { pageSize: 500 } });
  const [saveRecord] = useSaveMasterRecordMutation();
  const [deleteRecord] = useDeleteMasterRecordMutation();

  const data: Data = useMemo(
    () => ({ properties: properties.data?.data ?? [], workOrders: workOrders.data?.data ?? [], products: products.data?.data ?? [], levels: levels.data?.data ?? [], codes: codes.data?.data ?? [], disposals: disposals.data?.data ?? [] }),
    [properties.data, workOrders.data, products.data, levels.data, codes.data, disposals.data],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FILTER_KEY);
      if (saved) setFilters((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      // Defaults apply.
    }
  }, []);

  const allCards = Object.entries(HUBS).flatMap(([key, value]) => value.cards.map((card) => ({ ...card, hub: key as Exclude<Hub, "custom"> })));
  const selected = allCards.find((card) => card.key === reportKey) ?? allCards[0];
  const forms = config ? REPORT_FORMS.filter((form) => config.formGroups.includes(form.group)) : [];
  const parameters = () => [hub === "disposal" ? `${formatDate(filters.from)} – ${formatDate(filters.to)}` : `As of ${formatDate(filters.asOf)}`, filters.category || "All Categories", locations.options.find((option) => option.value === filters.location)?.label ?? "All Locations", filters.status || "All Status"].join(" · ");

  const build = (card = selected) => ({ title: card.title, built: card.build(data, filters), parameters: parameters() });
  const csv = (title: string, built: Built) => exportToCsv(title.toLowerCase().replace(/\W+/g, "-"), built.rows, built.columns.map((column) => ({ header: column.label, value: (row: Row) => row[column.key] })));

  const generate = async () => {
    const result = build();
    setPreview(result);
    try {
      await saveRecord({ resource: "generated-reports", body: { name: result.title, hub: selected.hub, reportKey: selected.key, parameters: result.parameters, generatedBy: user?.name ?? "System", generatedAt: new Date().toISOString() } }).unwrap();
    } catch (error) {
      toast.error("The report was generated but not added to Recent Reports", error);
    }
  };

  const hubReports = (reports.data?.data ?? []).filter((report) => hub === "custom" || report.hub === hub);

  return (
    <>
      <PageHeader icon={BarChart3} title="Property Reports" description="Generate and view reports on property assets, transactions, status, valuation, and compliance." />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 bg-brand-600 px-4 py-3 text-white"><BarChart3 className="h-5 w-5" /><h2 className="text-base font-bold">{config ? `${config.title} Reports` : "Custom Reports"}</h2></div>
        <Tabs
          label="Report hubs"
          className="px-4"
          value={hub}
          onChange={(value) => {
            setHub(value);
            setCategory(0);
            if (value !== "custom") setReportKey(HUBS[value].cards[0].key);
          }}
          items={[
            { value: "property", label: "Property Reports", icon: Landmark },
            { value: "inventory", label: "Inventory Reports", icon: Boxes },
            { value: "maintenance", label: "Maintenance Reports", icon: Wrench },
            { value: "disposal", label: "Disposal Reports", icon: Trash2 },
            { value: "custom", label: "Custom Reports", icon: Settings2 },
          ]}
        />
        <div className="space-y-4 p-4">
          {config ? (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <FormBlock title="Report Categories" icon={FileText}>
                <ul className="space-y-1">
                  {config.categories.map((name, index) => (
                    <li key={name}>
                      <button type="button" onClick={() => setCategory(index)} aria-current={category === index ? "true" : undefined} className={cn("w-full rounded-md px-3 py-2 text-left text-[13px] font-medium", category === index ? "bg-brand-600 text-white" : "hover:bg-slate-100")}>{name}</button>
                    </li>
                  ))}
                </ul>
              </FormBlock>
              <FormBlock title={config.categories[category]} icon={FileBarChart}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {config.cards.map((card) => (
                    <button key={card.key} type="button" onClick={() => setReportKey(card.key)} className={cn("flex items-start gap-3 rounded-lg border p-4 text-left", reportKey === card.key ? "border-brand-600 bg-brand-50" : "border-line hover:bg-slate-50")}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf2fe] text-[#2f6fd6]"><FileBarChart className="h-5 w-5" /></span>
                      <span><b className="block text-[13px]">{card.title}</b><span className="text-xs text-slate-600">{card.description}</span></span>
                    </button>
                  ))}
                </div>
                {category > 0 && forms.length > 0 && (
                  <>
                    <p className="mb-2 mt-4 text-[13px] font-bold">Related government forms</p>
                    <div className="flex flex-wrap gap-2">
                      {forms.map((form) => <Button key={form.code} size="sm" variant="outline" onClick={() => router.push(`/forms/${form.code}`)} leftIcon={<FileText className="h-3.5 w-3.5" />}>{form.title}</Button>)}
                    </div>
                  </>
                )}
              </FormBlock>
            </div>
          ) : (
            <FormBlock title="Custom Reports" icon={Settings2}>
              <p className="mb-3 text-[13px] text-slate-600">Pick any report from the four hubs and combine it with your own filters below.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {allCards.map((card) => (
                  <button key={card.key} type="button" onClick={() => setReportKey(card.key)} className={cn("rounded-lg border px-3 py-2 text-left text-[13px]", reportKey === card.key ? "border-brand-600 bg-brand-50 font-semibold" : "border-line hover:bg-slate-50")}>{card.title}<span className="block text-xs capitalize text-slate-500">{card.hub}</span></button>
                ))}
              </div>
            </FormBlock>
          )}

          <FormBlock title="Generate Report" icon={FileBarChart}>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Report Type <span className="sr-only">required</span><Select value={reportKey} onChange={(event) => setReportKey(event.target.value)} options={(config ? config.cards : allCards).map((card) => ({ label: card.title, value: card.key }))} /></label>
              {hub === "disposal" ? (
                <>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Period From<Input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Period To<Input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
                </>
              ) : (
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">As of Date<Input type="date" value={filters.asOf} onChange={(event) => setFilters((current) => ({ ...current, asOf: event.target.value }))} /></label>
              )}
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Category<Select placeholder="All Categories" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} options={PROPERTY_CATEGORIES.map((value) => ({ label: value, value }))} /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Location<Select key={locations.options.length} placeholder="All Locations" value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} options={locations.options} /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Status<Select placeholder="All Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={[{ label: "In Service", value: "available" }, { label: "In Use", value: "assigned" }, { label: "For Maintenance", value: "for-maintenance" }, { label: "For Disposal", value: "for-disposal" }, { label: "Disposed", value: "disposed" }]} /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    window.localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
                    toast.success("Filter saved", "These filters load the next time you open the report hub.");
                  } catch {
                    toast.error("Could not save the filter", "Browser storage is not available.");
                  }
                }}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Filter
              </Button>
              <span className="flex-1" />
              <Button variant="outline" onClick={() => setPreview(build())} leftIcon={<Eye className="h-4 w-4" />}>Preview</Button>
              <Button variant="outline" onClick={() => { const result = build(); csv(result.title, result.built); toast.success("Export ready", result.title); }} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>Export to Excel</Button>
              <Button variant="outline" className="border-brand-600 text-brand-600" onClick={() => { setPreview(build()); window.setTimeout(() => window.print(), 400); }} leftIcon={<Printer className="h-4 w-4" />}>Export to PDF</Button>
              <Button onClick={generate} leftIcon={<FileBarChart className="h-4 w-4" />}>Generate Report</Button>
            </div>
          </FormBlock>

          <FormBlock title="Recent Reports" icon={FileText}>
            <table className="w-full text-[13px]">
              <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Report Name</th><th className={cell}>Parameters</th><th className={cell}>Generated By</th><th className={cell}>Generated Date</th><th className={cn(cell, "text-center")}>Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {hubReports.slice(0, 10).map((report, index) => {
                  const card = allCards.find((item) => item.key === report.reportKey);
                  return (
                    <tr key={report.id}>
                      <td className={cn(cell, "text-slate-500")}>{index + 1}</td>
                      <td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{String(report.name)}</td>
                      <td className={cn(cell, "text-[#2f6fd6]")}>{String(report.parameters ?? "—")}</td>
                      <td className={cell}>{String(report.generatedBy ?? "—")}</td>
                      <td className={cn(cell, "whitespace-nowrap")}>{formatDateTime(String(report.generatedAt))}</td>
                      <td className={cell}>
                        <span className="flex justify-center gap-1">
                          <button type="button" aria-label={`View ${String(report.name)}`} disabled={!card} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={() => card && setPreview({ title: card.title, built: card.build(data, filters), parameters: String(report.parameters ?? "") })}><Eye className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Download ${String(report.name)}`} disabled={!card} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={() => card && csv(card.title, card.build(data, filters))}><Download className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Delete ${String(report.name)}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-red-600 hover:bg-red-50" onClick={async () => { try { await deleteRecord({ resource: "generated-reports", id: report.id }).unwrap(); toast.success("Report removed", String(report.name)); } catch (error) { toast.error("Could not remove the report", error); } }}><Trash2 className="h-4 w-4" /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!hubReports.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No reports generated yet.</td></tr>}
              </tbody>
            </table>
          </FormBlock>
        </div>
      </Card>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        size="xl"
        title={preview?.title ?? ""}
        description={preview?.parameters}
        footer={
          <>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            <Button variant="outline" onClick={() => preview && csv(preview.title, preview.built)} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>Export to Excel</Button>
            <Button onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print / PDF</Button>
          </>
        }
      >
        {preview && (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0"><tr className={head}>{preview.built.columns.map((column) => <th key={column.key} className={cn(cell, (column.money || column.number) && "text-right")}>{column.label}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {preview.built.rows.map((row, index) => (
                  <tr key={index}>{preview.built.columns.map((column) => <td key={column.key} className={cn(cell, (column.money || column.number) && "text-right")}>{column.money ? formatCurrency(Number(row[column.key] ?? 0)) : column.number ? formatNumber(Number(row[column.key] ?? 0)) : String(row[column.key] ?? "—")}</td>)}</tr>
                ))}
                {!preview.built.rows.length && <tr><td colSpan={preview.built.columns.length} className="px-3 py-6 text-center text-slate-500">No records for these filters.</td></tr>}
              </tbody>
              {preview.built.columns.some((column) => column.money) && preview.built.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    {preview.built.columns.map((column, index) => <td key={column.key} className={cn(cell, (column.money || column.number) && "text-right")}>{index === 0 ? "Total" : column.money ? formatCurrency(preview.built.rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)) : column.number ? formatNumber(preview.built.rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)) : ""}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}
