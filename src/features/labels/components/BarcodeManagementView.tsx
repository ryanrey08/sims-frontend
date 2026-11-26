"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode as BarcodeIcon,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Eraser,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  LayoutTemplate,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  Tags,
  Trash2,
  XCircle,
} from "lucide-react";
import { Barcode, QrImage } from "@/components/labels/Codes";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ModalIcon } from "@/components/common/SuccessDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormBlock } from "@/components/forms/HField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { categoryTone } from "@/constants/options";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermission";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { exportToCsv } from "@/lib/utils/csv";
import { formatDate, formatDateTime, formatNumber, todayISO } from "@/lib/utils/format";
import { useGetCategoriesQuery } from "@/services/api/endpoints/categoriesApi";
import { useDeleteMasterRecordMutation, useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import type { Product } from "@/types/models";
import type { MasterRecord } from "@/types/records";
import { LabelPreview, type LabelOptions } from "./LabelPreview";

type Tab = "generate" | "barcodes" | "qr" | "templates" | "scan" | "history";
type GenerateMode = "Barcode" | "QR Code" | "Both";
const head = "bg-[#f3f4f6] text-left text-xs font-bold text-ink";
const cell = "px-3 py-2.5";
const LABEL_TYPES = [
  { label: "Barcode & QR Code", value: "both" },
  { label: "Barcode Only", value: "barcode" },
  { label: "QR Code Only", value: "qr" },
];

interface PrintSettings extends LabelOptions {
  templateId: string;
  labelSize: string;
  paperType: string;
  columns: number;
  rows: number;
  copies: number;
}

function useLabelData() {
  const products = useGetProductsQuery({ pageSize: 1000, sortBy: "sku", status: "active" });
  const codes = useGetMasterRecordsQuery({ resource: "label-codes", params: { pageSize: 5000 } });
  const templates = useGetMasterRecordsQuery({ resource: "label-templates", params: { pageSize: 100 } });
  const prints = useGetMasterRecordsQuery({ resource: "label-prints", params: { pageSize: 500, sortBy: "printedAt", sortOrder: "desc" } });
  return { products, codes, templates, prints };
}

function codesFor(codes: MasterRecord[], productId: string) {
  const own = codes.filter((code) => code.productId === productId && code.status === "active");
  return { barcode: own.find((code) => code.codeType === "Barcode")?.code as string | undefined, qr: own.find((code) => code.codeType === "QR Code")?.code as string | undefined };
}

/** "Barcode / QR Management" screens (mockup p44–p50). */
export function BarcodeManagementView() {
  const [tab, setTab] = useState<Tab>("generate");
  const data = useLabelData();
  const codes = useMemo(() => data.codes.data?.data ?? [], [data.codes.data]);
  const prints = data.prints.data?.data ?? [];
  const productIds = new Set(codes.filter((code) => code.status === "active").map((code) => `${code.codeType}:${code.productId}`));
  const items = data.products.data?.data ?? [];
  const lastPrint = prints[0];

  return (
    <>
      <PageHeader icon={BarcodeIcon} title="Barcode / QR Management" description="Generate, print, and manage barcode and QR code labels for inventory items, assets, and storage locations." />
      <StatGrid columns={4}>
        <StatCard label="Items with Barcode" value={formatNumber(items.filter((item) => productIds.has(`Barcode:${item.id}`)).length)} icon={BarcodeIcon} accent="blue" loading={!data.codes.data} />
        <StatCard label="Items with QR Code" value={formatNumber(items.filter((item) => productIds.has(`QR Code:${item.id}`)).length)} icon={QrCode} accent="green" loading={!data.codes.data} />
        <StatCard label="Labels Generated" value={formatNumber(prints.reduce((sum, job) => sum + Number(job.labels ?? 0), 0))} icon={Tags} accent="yellow" loading={!data.prints.data} />
        <StatCard label="Last Generated" value={<span className="text-base">{lastPrint ? formatDateTime(String(lastPrint.printedAt)) : "—"}</span>} icon={Clock} accent="pink" loading={!data.prints.data} />
      </StatGrid>
      <Card>
        <Tabs
          label="Barcode and QR sections"
          className="px-4"
          value={tab}
          onChange={setTab}
          items={[
            { value: "generate", label: "Generate Labels", icon: Tags },
            { value: "barcodes", label: "Manage Barcodes", icon: BarcodeIcon },
            { value: "qr", label: "Manage QR Codes", icon: QrCode },
            { value: "templates", label: "Label Templates", icon: LayoutTemplate },
            { value: "scan", label: "Scan / Verify", icon: ScanLine },
            { value: "history", label: "Print History", icon: History },
          ]}
        />
        {tab === "generate" && <GenerateLabels data={data} codes={codes} />}
        {(tab === "barcodes" || tab === "qr") && <ManageCodes key={tab} codeType={tab === "barcodes" ? "Barcode" : "QR Code"} codes={codes} products={items} />}
        {tab === "templates" && <LabelTemplates templates={data.templates.data?.data ?? []} sample={items[0]} />}
        {tab === "scan" && <ScanVerify codes={codes} products={items} />}
        {tab === "history" && (
          <table className="w-full text-[13px]">
            <thead><tr className={head}><th className="px-4 py-2.5">Reference</th><th className={cell}>Date / Time</th><th className={cell}>Label Type</th><th className={cell}>Template</th><th className={cn(cell, "text-right")}>Items</th><th className={cn(cell, "text-right")}>Labels</th><th className={cell}>Printed By</th></tr></thead>
            <tbody className="divide-y divide-line">
              {prints.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-2.5 font-semibold text-[#2f6fd6]">{String(job.reference)}</td>
                  <td className={cell}>{formatDateTime(String(job.printedAt))}</td>
                  <td className={cell}>{String(job.labelType)}</td>
                  <td className={cell}>{String(job.template ?? "—")}</td>
                  <td className={cn(cell, "text-right")}>{formatNumber(Number(job.items ?? 0))}</td>
                  <td className={cn(cell, "text-right")}>{formatNumber(Number(job.labels ?? 0))}</td>
                  <td className={cell}>{String(job.printedBy ?? "—")}</td>
                </tr>
              ))}
              {!prints.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No labels have been printed yet.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

/** Generate Labels tab (p44) with the Generate Barcode / QR modals (p45–p46). */
function GenerateLabels({ data, codes }: { data: ReturnType<typeof useLabelData>; codes: MasterRecord[] }) {
  const toast = useToast();
  const { can } = usePermissions();
  const user = useAppSelector(selectCurrentUser);
  const { data: warehouses } = useGetWarehousesQuery({ pageSize: 100 });
  const { data: categories } = useGetCategoriesQuery();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [modal, setModal] = useState<GenerateMode | null>(null);
  const [printing, setPrinting] = useState<Product[] | null>(null);
  const [saveRecord, { isLoading: saving }] = useSaveMasterRecordMutation();
  const templates = data.templates.data?.data ?? [];
  const [settings, setSettings] = useState<PrintSettings>({ templateId: "", labelSize: "100 mm x 50 mm", paperType: "Sticker / Label", columns: 2, rows: 5, copies: 1, includeLogo: true, includeDetails: true, includeBarcode: true, includeQr: true });
  const { data: stockData } = useGetProductsQuery({ pageSize: 1000, sortBy: "sku", status: "active", warehouseId: filters.warehouseId || undefined });
  const products = (stockData?.data ?? data.products.data?.data ?? []).filter(
    (item) =>
      (!filters.categoryId || item.categoryId === filters.categoryId) &&
      (!search || `${item.sku} ${item.name}`.toLowerCase().includes(search.toLowerCase())) &&
      (!filters.labelType || labelTypeOf(item.id) === filters.labelType),
  );
  const chosen = products.filter((item) => selected.has(item.id));
  const focus = products.find((item) => item.id === focusId) ?? chosen[0] ?? products[0];

  function labelTypeOf(productId: string) {
    const own = codesFor(codes, productId);
    return own.barcode && own.qr ? "both" : own.barcode ? "barcode" : own.qr ? "qr" : "none";
  }


  useEffect(() => {
    if (!printing) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [printing]);

  const setTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id);
    setSettings((current) => ({
      ...current,
      templateId: id,
      labelSize: String(template?.labelSize ?? current.labelSize),
      includeLogo: Boolean(template?.showLogo ?? current.includeLogo),
      includeDetails: Boolean(template?.showDetails ?? current.includeDetails),
      includeBarcode: Boolean(template?.showBarcode ?? current.includeBarcode),
      includeQr: Boolean(template?.showQr ?? current.includeQr),
    }));
  };

  // Start from the standard item label template once templates load.
  useEffect(() => {
    if (settings.templateId || !templates.length) return;
    const standard = templates.find((item) => String(item.name).startsWith("Item Label")) ?? templates[0];
    setTemplate(standard.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, settings.templateId]);

  const generate = async (mode: GenerateMode, print: boolean) => {
    if (!chosen.length) return toast.error("Select items first", "Tick the items to label.");
    const types = mode === "Both" ? (["Barcode", "QR Code"] as const) : ([mode] as const);
    try {
      let created = 0;
      for (const item of chosen) {
        for (const type of types) {
          const existing = codes.find((code) => code.productId === item.id && code.codeType === type && code.status === "active");
          if (existing) continue;
          const prefix = type === "Barcode" ? "BC" : "QR";
          await saveRecord({ resource: "label-codes", body: { code: `${prefix}-${String(Date.now() % 100000000).padStart(8, "0")}${created}`, codeType: type, productId: item.id, generatedBy: user?.name ?? "System", generatedAt: todayISO(), printCount: print ? 1 : 0, status: "active" } }).unwrap();
          created += 1;
        }
      }
      if (print) {
        const count = chosen.length * settings.copies;
        await saveRecord({
          resource: "label-prints",
          body: { reference: `LBL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, labelType: mode === "Both" ? "Barcode & QR Code" : `${mode} Only`, template: String(templates.find((item) => item.id === settings.templateId)?.name ?? "Custom"), items: chosen.length, labels: count, printedBy: user?.name ?? "System", printedAt: new Date().toISOString() },
        }).unwrap();
        setPrinting(chosen.flatMap((item) => Array.from({ length: settings.copies }, () => item)));
      }
      setModal(null);
      toast.success(print ? "Labels sent to the printer" : "Codes generated", `${created} new code(s) for ${chosen.length} item(s).`);
    } catch (error) {
      toast.error("Could not generate labels", error);
    }
  };

  const options = (mode: GenerateMode | null): LabelOptions => ({
    ...settings,
    includeBarcode: mode === "QR Code" ? false : settings.includeBarcode,
    includeQr: mode === "Barcode" ? false : settings.includeQr,
  });

  return (
    <div className="p-4">
      <div className="print-hidden mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <FilterSelect layout="stacked" label="Warehouse" allLabel="All Warehouses" value={draft.warehouseId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, warehouseId: value }))} options={(warehouses?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id }))} />
        <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.categoryId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
        <FilterSelect layout="stacked" label="Label Type" allLabel="All Types" value={draft.labelType ?? ""} onChange={(value) => setDraft((current) => ({ ...current, labelType: value }))} options={LABEL_TYPES} />
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-slate-700">Search</span>
          <SearchInput value={search} onChange={setSearch} placeholder="Search item code or description..." label="Search items" />
        </div>
        <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => setFilters(draft)}>Search</Button>
      </div>
      <div className="print-hidden grid gap-4 2xl:grid-cols-[1.9fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="sticky top-0">
                <tr className={head}>
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-brand-600" checked={products.length > 0 && chosen.length === products.length} onChange={(event) => setSelected(event.target.checked ? new Set(products.map((item) => item.id)) : new Set())} /></th>
                  <th className={cell}>#</th><th className={cell}>Item Code</th><th className={cell}>Item Description</th><th className={cell}>Category</th><th className={cell}>UoM</th><th className={cn(cell, "text-right")}>On Hand</th><th className={cell}>Label Type</th><th className={cell}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((item, index) => {
                  const type = labelTypeOf(item.id);
                  return (
                    <tr key={item.id} onClick={() => setFocusId(item.id)} className={cn("cursor-pointer", focus?.id === item.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
                      <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${item.sku}`} className="h-4 w-4 accent-brand-600" checked={selected.has(item.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} />
                      </td>
                      <td className={cn(cell, "text-slate-500")}>{index + 1}</td>
                      <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6]")}>{item.sku}</td>
                      <td className={cell}>{item.name}</td>
                      <td className={cell}><Badge tone={categoryTone(item.categoryName)}>{item.categoryName}</Badge></td>
                      <td className={cell}>{item.unit}</td>
                      <td className={cn(cell, "text-right")}>{formatNumber(item.totalStock ?? 0)}</td>
                      <td className={cn(cell, "whitespace-nowrap")}>{LABEL_TYPES.find((option) => option.value === type)?.label ?? "—"}</td>
                      <td className={cn(cell, "whitespace-nowrap")}><Badge tone={type === "none" ? "danger" : "success"}>{type === "none" ? "Not Generated" : "Generated"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t border-line bg-slate-50 px-4 py-2.5 text-[13px]">
            <span>Select All ({products.length})</span>
            <span>Selected Items: <b>{chosen.length}</b></span>
          </div>
        </div>
        <div className="space-y-4">
          <FormBlock title={`Label Preview${focus ? ` (${focus.sku})` : ""}`} icon={Eye}>
            {focus ? <LabelPreview product={focus} options={settings} codes={codesFor(codes, focus.id)} /> : <p className="text-[13px] text-slate-500">Select an item to preview its label.</p>}
          </FormBlock>
          <LabelSettings settings={settings} setSettings={setSettings} templates={templates} setTemplate={setTemplate} />
        </div>
      </div>
      {can(PERMISSIONS.productsManage) && (
        <div className="print-hidden mt-4 flex flex-wrap gap-2 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <Button variant="outline" onClick={() => setModal("Barcode")} disabled={!chosen.length} leftIcon={<BarcodeIcon className="h-4 w-4" />}>Generate Barcode</Button>
          <Button variant="outline" onClick={() => setModal("QR Code")} disabled={!chosen.length} leftIcon={<QrCode className="h-4 w-4" />}>Generate QR Code</Button>
          <Button variant="outline" onClick={() => setModal("Both")} disabled={!chosen.length} leftIcon={<Tags className="h-4 w-4" />}>Generate Both</Button>
          <Button variant="outline" onClick={() => generate("Both", true)} disabled={!chosen.length || saving} leftIcon={<Printer className="h-4 w-4" />}>Print Labels</Button>
          <Button variant="outline" onClick={() => setPrinting(chosen)} disabled={!chosen.length} leftIcon={<FileText className="h-4 w-4" />}>Export (PDF)</Button>
          <Button
            variant="outline"
            disabled={!chosen.length}
            onClick={() => {
              exportToCsv("labels", chosen, [
                { header: "Item Code", value: (row) => row.sku },
                { header: "Item Description", value: (row) => row.name },
                { header: "Barcode", value: (row) => codesFor(codes, row.id).barcode },
                { header: "QR Code", value: (row) => codesFor(codes, row.id).qr },
              ]);
              toast.success("Export ready", `${chosen.length} labels exported.`);
            }}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Export (Excel)
          </Button>
          <Button variant="outline" className="ml-auto border-red-300 text-red-600" onClick={() => setSelected(new Set())} disabled={!chosen.length} leftIcon={<Eraser className="h-4 w-4" />}>Clear Selection</Button>
        </div>
      )}
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="xl"
        icon={<ModalIcon tone="blue">{modal === "QR Code" ? <QrCode className="h-5 w-5" /> : <BarcodeIcon className="h-5 w-5" />}</ModalIcon>}
        title={modal === "QR Code" ? "Generate QR Code Labels" : modal === "Both" ? "Generate Barcode & QR Code Labels" : "Generate Barcode Labels"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
            <Button variant="outline" onClick={() => setPrinting(chosen.flatMap((item) => Array.from({ length: settings.copies }, () => item)))} leftIcon={<Eye className="h-4 w-4" />}>Preview (PDF)</Button>
            <Button loading={saving} onClick={() => modal && generate(modal, true)} leftIcon={<Printer className="h-4 w-4" />}>Generate &amp; Print</Button>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <LabelSettings settings={settings} setSettings={setSettings} templates={templates} setTemplate={setTemplate} title="Label Options" />
            <p className="flex items-start gap-2 rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-3 py-2 text-xs text-[#1d4fa3]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />Labels will be generated for {chosen.length} selected item(s). Total labels to print: {chosen.length * settings.copies}
            </p>
          </div>
          <div className="space-y-4">
            <FormBlock title="Label Preview" icon={Eye}>
              {chosen[0] ? <LabelPreview product={chosen[0]} options={options(modal)} codes={codesFor(codes, chosen[0].id)} /> : null}
            </FormBlock>
            <FormBlock title="Generation Summary" icon={Tags}>
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-slate-600">Selected Item(s)</dt><dd className="font-bold">{chosen.length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Copies per Item</dt><dd className="font-bold">{settings.copies}</dd></div>
              </dl>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#f8d3d3] bg-[#fdeeee] px-4 py-3">
                <span className="text-sm font-bold">Total Labels to Generate</span>
                <span className="text-xl font-bold text-brand-600">{chosen.length * settings.copies}</span>
              </div>
            </FormBlock>
          </div>
        </div>
      </Modal>
      {printing && (
        <div className="hidden print:grid" style={{ gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`, gap: "6mm" }}>
          {printing.map((item, index) => <LabelPreview key={`${item.id}-${index}`} product={item} options={settings} codes={codesFor(codes, item.id)} />)}
        </div>
      )}
    </div>
  );
}

function LabelSettings({ settings, setSettings, templates, setTemplate, title = "Label Settings" }: { settings: PrintSettings; setSettings: React.Dispatch<React.SetStateAction<PrintSettings>>; templates: MasterRecord[]; setTemplate: (id: string) => void; title?: string }) {
  const number = (key: "columns" | "rows" | "copies", label: string) => (
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
      {label}
      <Input type="number" min={1} max={key === "copies" ? 100 : 10} value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: Math.max(1, Math.min(key === "copies" ? 100 : 10, Number(event.target.value) || 1)) }))} />
    </label>
  );
  return (
    <FormBlock title={title} icon={LayoutTemplate}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700 sm:col-span-2">
          Label Template
          <Select value={settings.templateId} onChange={(event) => setTemplate(event.target.value)} options={templates.map((item) => ({ label: String(item.name), value: item.id }))} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
          Label Size
          <Select value={settings.labelSize} onChange={(event) => setSettings((current) => ({ ...current, labelSize: event.target.value }))} options={["100 mm x 50 mm", "80 mm x 50 mm", "60 mm x 40 mm", "50 mm x 25 mm", "40 mm x 25 mm", "100 mm x 30 mm"].map((value) => ({ label: value, value }))} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
          Paper Type
          <Select value={settings.paperType} onChange={(event) => setSettings((current) => ({ ...current, paperType: event.target.value }))} options={["Sticker / Label", "A4 Paper", "Thermal Roll"].map((value) => ({ label: value, value }))} />
        </label>
        {number("columns", "Columns")}
        {number("rows", "Rows")}
        {number("copies", "Copies per Item")}
      </div>
      <div className="mt-3 grid gap-2">
        <Switch id={`${title}-logo`} label="Include Logo" checked={settings.includeLogo} onChange={(event) => setSettings((current) => ({ ...current, includeLogo: event.target.checked }))} />
        <Switch id={`${title}-details`} label="Include Item Details" checked={settings.includeDetails} onChange={(event) => setSettings((current) => ({ ...current, includeDetails: event.target.checked }))} />
        <Switch id={`${title}-qr`} label="Include QR Code" checked={settings.includeQr} onChange={(event) => setSettings((current) => ({ ...current, includeQr: event.target.checked }))} />
      </div>
    </FormBlock>
  );
}

/** Manage Barcodes / Manage QR Codes tabs (p47–p48). */
function ManageCodes({ codeType, codes, products }: { codeType: "Barcode" | "QR Code"; codes: MasterRecord[]; products: Product[] }) {
  const toast = useToast();
  const { can } = usePermissions();
  const { data: categories } = useGetCategoriesQuery();
  const [saveRecord] = useSaveMasterRecordMutation();
  const [deleteRecord] = useDeleteMasterRecordMutation();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [page, setPage] = useState(1);
  const productById = new Map(products.map((item) => [item.id, item]));
  const ofType = codes.filter((code) => code.codeType === codeType);
  const rows = ofType.filter((code) => {
    const product = productById.get(String(code.productId));
    return (!filters.status || code.status === filters.status) && (!filters.categoryId || product?.categoryId === filters.categoryId) && (!search || `${code.code} ${product?.sku} ${product?.name}`.toLowerCase().includes(search.toLowerCase()));
  });
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const focus = rows.find((code) => code.id === focusId) ?? pageRows[0];
  const focusProduct = focus ? productById.get(String(focus.productId)) : undefined;
  const chosen = rows.filter((code) => selected.has(code.id));
  const count = (status: string) => ofType.filter((code) => code.status === status).length;

  const setStatus = async (status: string) => {
    try {
      for (const code of chosen) await saveRecord({ resource: "label-codes", id: code.id, body: { ...code, status } }).unwrap();
      toast.success("Status updated", `${chosen.length} code(s) set to ${status}.`);
      setSelected(new Set());
    } catch (error) {
      toast.error("Could not update codes", error);
    }
  };

  return (
    <div className="p-4">
      <StatGrid columns={4}>
        <StatCard label={`Total ${codeType === "Barcode" ? "Barcodes" : "QR Codes"}`} value={formatNumber(ofType.length)} icon={codeType === "Barcode" ? BarcodeIcon : QrCode} accent="blue" />
        <StatCard label="Active" value={formatNumber(count("active"))} icon={CheckCircle2} accent="green" />
        <StatCard label="Inactive" value={formatNumber(count("inactive"))} icon={Clock} accent="yellow" />
        <StatCard label="Deactivated" value={formatNumber(count("deactivated"))} icon={XCircle} accent="pink" />
      </StatGrid>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <FilterSelect layout="stacked" label="Category" allLabel="All Categories" value={draft.categoryId ?? ""} onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))} options={(categories?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} />
        <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={["active", "inactive", "deactivated"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value }))} />
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-slate-700">Search</span>
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={`Search ${codeType === "Barcode" ? "barcode" : "QR"} no., item code or description...`} label="Search codes" />
        </div>
        <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => { setFilters(draft); setPage(1); }}>Search</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className={head}>
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 accent-brand-600" checked={pageRows.length > 0 && pageRows.every((code) => selected.has(code.id))} onChange={(event) => setSelected(event.target.checked ? new Set(pageRows.map((code) => code.id)) : new Set())} /></th>
                  <th className={cell}>#</th><th className={cell}>{codeType === "Barcode" ? "Barcode No." : "QR Code No."}</th><th className={cell}>Item Code</th><th className={cell}>Item Description</th><th className={cell}>UoM</th><th className={cn(cell, "text-right")}>On Hand</th><th className={cell}>Status</th><th className={cell}>Date Generated</th><th className={cell}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((code, index) => {
                  const product = productById.get(String(code.productId));
                  return (
                    <tr key={code.id} onClick={() => setFocusId(code.id)} className={cn("cursor-pointer", focus?.id === code.id ? "bg-[#fdf2f2]" : "hover:bg-slate-50")}>
                      <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${String(code.code)}`} className="h-4 w-4 accent-brand-600" checked={selected.has(code.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(code.id); else next.delete(code.id); return next; })} />
                      </td>
                      <td className={cn(cell, "text-slate-500")}>{(page - 1) * 10 + index + 1}</td>
                      <td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{String(code.code)}</td>
                      <td className={cell}>{product?.sku}</td>
                      <td className={cell}>{product?.name}</td>
                      <td className={cell}>{product?.unit}</td>
                      <td className={cn(cell, "text-right")}>{formatNumber(product?.totalStock ?? 0)}</td>
                      <td className={cell}><StatusBadge status={String(code.status)} label={String(code.status) === "deactivated" ? "Deactivated" : undefined} /></td>
                      <td className={cell}>{formatDate(String(code.generatedAt))}</td>
                      <td className={cell}><span className="flex gap-1"><button type="button" aria-label="View" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={(event) => { event.stopPropagation(); setFocusId(code.id); }}><Eye className="h-4 w-4" /></button></span></td>
                    </tr>
                  );
                })}
                {!pageRows.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No codes match the filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px]">
            <span>Showing {rows.length ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, rows.length)} of {rows.length} records</span>
            <span className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page * 10 >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
            </span>
          </div>
        </div>
        <FormBlock title={codeType === "Barcode" ? "Barcode Details" : "QR Code Details"} icon={codeType === "Barcode" ? BarcodeIcon : QrCode}>
          {focus && focusProduct ? (
            <>
              <div className="flex justify-center rounded-lg border border-line bg-white p-3">
                {codeType === "Barcode" ? <Barcode value={String(focus.code)} className="h-14 w-full" /> : <QrImage value={String(focus.code)} size={110} />}
              </div>
              <p className="mt-1 text-center font-mono text-xs tracking-widest">{String(focus.code)}</p>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                {[
                  ["Item Code", focusProduct.sku],
                  ["Description", focusProduct.name],
                  ["Category", focusProduct.categoryName],
                  ["UoM", focusProduct.unit],
                  ["On Hand", formatNumber(focusProduct.totalStock ?? 0)],
                  ["Generated On", formatDate(String(focus.generatedAt))],
                  ["Generated By", String(focus.generatedBy ?? "—")],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-slate-600">{label}</dt><dd className="font-semibold">{value}</dd></div>
                ))}
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-slate-600">Status</dt><dd><StatusBadge status={String(focus.status)} /></dd></div>
              </dl>
            </>
          ) : (
            <p className="text-[13px] text-slate-500">Select a code to see its details.</p>
          )}
        </FormBlock>
      </div>
      {can(PERMISSIONS.productsManage) && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <Button variant="outline" disabled={!chosen.length} onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Reprint Selected</Button>
          <Button variant="outline" disabled={!chosen.length} onClick={() => setStatus("inactive")} leftIcon={<Clock className="h-4 w-4" />}>Set as Inactive</Button>
          <Button variant="outline" disabled={!chosen.length} onClick={() => setStatus("active")} leftIcon={<RotateCcw className="h-4 w-4" />}>Activate</Button>
          <Button
            variant="outline"
            onClick={() => {
              exportToCsv(codeType === "Barcode" ? "barcodes" : "qr-codes", rows, [
                { header: "Code No.", value: (row) => String(row.code) },
                { header: "Item Code", value: (row) => productById.get(String(row.productId))?.sku },
                { header: "Item Description", value: (row) => productById.get(String(row.productId))?.name },
                { header: "Status", value: (row) => String(row.status) },
                { header: "Date Generated", value: (row) => String(row.generatedAt) },
              ]);
              toast.success("Export ready", `${rows.length} codes exported.`);
            }}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Export (Excel)
          </Button>
          <Button variant="outline" disabled={!chosen.length} onClick={() => window.print()} leftIcon={<FileText className="h-4 w-4" />}>Export (PDF)</Button>
          <Button variant="outline" className="ml-auto border-red-300 text-red-600" disabled={!chosen.length} onClick={() => setConfirmDelete(true)} leftIcon={<Trash2 className="h-4 w-4" />}>Delete Selected</Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete selected codes?"
        description={`${chosen.length} code(s) will be deleted. Printed labels with these codes will no longer verify.`}
        confirmLabel="Delete codes"
        onConfirm={async () => {
          try {
            for (const code of chosen) await deleteRecord({ resource: "label-codes", id: code.id }).unwrap();
            toast.success("Codes deleted", `${chosen.length} code(s) removed.`);
            setSelected(new Set());
          } catch (error) {
            toast.error("Could not delete codes", error);
          }
          setConfirmDelete(false);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/** Label Templates tab (p49): template list, live preview and properties. */
function LabelTemplates({ templates, sample }: { templates: MasterRecord[]; sample?: Product }) {
  const toast = useToast();
  const { can } = usePermissions();
  const [saveRecord, { isLoading: saving }] = useSaveMasterRecordMutation();
  const [deleteRecord] = useDeleteMasterRecordMutation();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = templates.find((item) => item.id === activeId) ?? templates[0];
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (active) setForm({ name: String(active.name), category: String(active.category), labelSize: String(active.labelSize), orientation: String(active.orientation), showLogo: Boolean(active.showLogo), showDetails: Boolean(active.showDetails), showBarcode: Boolean(active.showBarcode), showQr: Boolean(active.showQr) });
  }, [active]);

  const save = async (id?: string, overrides: Record<string, string | boolean> = {}) => {
    try {
      const saved = await saveRecord({ resource: "label-templates", id, body: { ...form, ...overrides, status: "active" } }).unwrap();
      toast.success("Template saved", String(saved.name));
      setActiveId(saved.id);
    } catch (error) {
      toast.error("Could not save template", error);
    }
  };

  const options: LabelOptions = { includeLogo: Boolean(form.showLogo), includeDetails: Boolean(form.showDetails), includeBarcode: Boolean(form.showBarcode), includeQr: Boolean(form.showQr) };
  const list = templates.filter((item) => String(item.name).toLowerCase().includes(search.toLowerCase()));
  const [width] = String(form.labelSize ?? "100 mm").split(" ");

  return (
    <div className="grid gap-4 p-4 xl:grid-cols-[260px_1fr_300px]">
      <FormBlock title="Template List" icon={LayoutTemplate}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search template..." label="Search templates" />
        {can(PERMISSIONS.productsManage) && (
          <Button size="sm" className="mt-2 w-full" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setActiveId(null); setForm({ name: "New Template", category: "Item Label", labelSize: "100 mm x 50 mm", orientation: "Landscape", showLogo: true, showDetails: true, showBarcode: true, showQr: true }); }}>New Template</Button>
        )}
        <ul className="mt-3 space-y-1.5">
          {list.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setActiveId(item.id)} className={cn("w-full rounded-md border px-3 py-2 text-left text-[13px]", active?.id === item.id ? "border-brand-600 bg-brand-50" : "border-line hover:bg-slate-50")}>
                <span className="block font-semibold">{String(item.name)}</span>
                <span className="text-xs text-slate-500">{String(item.labelSize)}</span>
              </button>
            </li>
          ))}
        </ul>
      </FormBlock>
      <FormBlock title={`Template Designer – ${String(form.name ?? "")}`} icon={LayoutTemplate}>
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-[repeating-linear-gradient(0deg,#f8fafc,#f8fafc_19px,#eef2f7_20px)] p-6">
          {sample && <LabelPreview product={sample} options={options} className={cn("shadow-sm", form.orientation === "Portrait" ? "w-56" : "w-96")} />}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Label Size {String(form.labelSize ?? "")} · {String(form.orientation ?? "")} · preview at {width} mm width</p>
      </FormBlock>
      <FormBlock title="Label Properties" icon={Tags}>
        <div className="space-y-3 text-xs font-semibold text-slate-700">
          <label className="flex flex-col gap-1">Template Name <span className="sr-only">required</span><Input value={String(form.name ?? "")} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="flex flex-col gap-1">Category<Select value={String(form.category ?? "")} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} options={["Item Label", "Inventory Label", "Asset Label", "Location Label", "Property Tag"].map((value) => ({ label: value, value }))} /></label>
          <label className="flex flex-col gap-1">Label Size<Select value={String(form.labelSize ?? "")} onChange={(event) => setForm((current) => ({ ...current, labelSize: event.target.value }))} options={["100 mm x 50 mm", "80 mm x 50 mm", "60 mm x 40 mm", "50 mm x 25 mm", "40 mm x 25 mm", "100 mm x 30 mm"].map((value) => ({ label: value, value }))} /></label>
          <div>
            <p className="mb-1">Orientation</p>
            <div className="flex gap-2">
              {["Landscape", "Portrait"].map((value) => (
                <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, orientation: value }))} className={cn("flex-1 rounded-md border px-3 py-1.5 text-[13px]", form.orientation === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line")}>{value}</button>
              ))}
            </div>
          </div>
          <p className="pt-1">Layout Options</p>
          <Switch id="tpl-logo" label="Show Organization Logo" checked={Boolean(form.showLogo)} onChange={(event) => setForm((current) => ({ ...current, showLogo: event.target.checked }))} />
          <Switch id="tpl-details" label="Show Item Details" checked={Boolean(form.showDetails)} onChange={(event) => setForm((current) => ({ ...current, showDetails: event.target.checked }))} />
          <Switch id="tpl-barcode" label="Show Barcode" checked={Boolean(form.showBarcode)} onChange={(event) => setForm((current) => ({ ...current, showBarcode: event.target.checked }))} />
          <Switch id="tpl-qr" label="Show QR Code" checked={Boolean(form.showQr)} onChange={(event) => setForm((current) => ({ ...current, showQr: event.target.checked }))} />
        </div>
        {can(PERMISSIONS.productsManage) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-3.5 w-3.5" />}>Test Print</Button>
            <Button size="sm" variant="outline" onClick={() => save(undefined, { name: `${String(form.name)} (copy)` })} leftIcon={<Copy className="h-3.5 w-3.5" />}>Duplicate</Button>
            <Button size="sm" variant="outline" className="text-red-600" disabled={!active || !activeId} onClick={() => setConfirmDelete(true)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
            <Button size="sm" loading={saving} onClick={() => save(activeId ?? undefined)}>Save Template</Button>
          </div>
        )}
      </FormBlock>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete template?"
        description={`Delete “${String(active?.name ?? "")}”?`}
        confirmLabel="Delete template"
        onConfirm={async () => {
          if (active) {
            try {
              await deleteRecord({ resource: "label-templates", id: active.id }).unwrap();
              toast.success("Template deleted", String(active.name));
              setActiveId(null);
            } catch (error) {
              toast.error("Could not delete template", error);
            }
          }
          setConfirmDelete(false);
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

const SCAN_MODES = ["Scan Item", "Verify Item Location", "Check Item Status", "Validate Asset / Property"];
const SCAN_HISTORY_KEY = "sims.scanHistory";

interface ScanEntry {
  at: string;
  code: string;
  description: string;
  type: string;
  valid: boolean;
}

/** Scan / Verify tab (p50): camera scanning where the browser supports it, or typed / scanner-gun input. */
function ScanVerify({ codes, products }: { codes: MasterRecord[]; products: Product[] }) {
  const router = useRouter();
  const [mode, setMode] = useState(SCAN_MODES[0]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ code: string; valid: boolean; product?: Product; record?: MasterRecord } | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(window.localStorage.getItem(SCAN_HISTORY_KEY) ?? "[]"));
    } catch {
      setHistory([]);
    }
  }, []);

  const verify = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const record = codes.find((item) => String(item.code).toLowerCase() === code.toLowerCase());
    const product = products.find((item) => item.id === record?.productId) ?? products.find((item) => item.sku.toLowerCase() === code.toLowerCase() || item.barcode === code);
    const valid = Boolean(product) && (!record || record.status === "active");
    setResult({ code, valid, product, record });
    const entry: ScanEntry = { at: new Date().toISOString(), code, description: product?.name ?? "Unknown code", type: String(record?.codeType ?? (product ? "Item Code" : "—")), valid };
    setHistory((current) => {
      const next = [entry, ...current].slice(0, 20);
      try {
        window.localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // History is a convenience only.
      }
      return next;
    });
  };

  const startCamera = async () => {
    setCameraError("");
    type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const DetectorClass = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia) return setCameraError("This browser cannot open the camera. Type the code or use a scanner gun instead.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      setScanning(true);
      if (!DetectorClass) {
        setCameraError("Live code detection is not supported in this browser. Type the code shown on the label.");
        return;
      }
      const detector = new DetectorClass({ formats: ["code_39", "qr_code", "code_128", "ean_13"] });
      const loop = async () => {
        if (!video.current?.srcObject) return;
        const found = await detector.detect(video.current).catch(() => []);
        if (found[0]) {
          verify(found[0].rawValue);
          stopCamera();
        } else window.setTimeout(loop, 400);
      };
      void loop();
    } catch {
      setCameraError("Camera access was blocked. Allow the camera, or type the code instead.");
    }
  };

  const stopCamera = () => {
    const stream = video.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
    setScanning(false);
  };

  useEffect(() => stopCamera, []);

  return (
    <div className="p-4">
      <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
        <FormBlock title="Scan Options" icon={ScanLine}>
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Scan mode</legend>
            {SCAN_MODES.map((value) => (
              <label key={value} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-[13px]", mode === value ? "border-[#cfe0fb] bg-[#eaf2fe] font-semibold" : "border-line")}>
                <input type="radio" name="scan-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="accent-brand-600" />
                {value}
              </label>
            ))}
          </fieldset>
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              verify(input);
            }}
          >
            <label htmlFor="scan-input" className="text-xs font-semibold text-slate-700">Input / Scan Code</label>
            <div className="mt-1 flex gap-2">
              <Input id="scan-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="BC-… / QR-… / ITM-…" autoComplete="off" />
              <Button type="submit" variant="outline" size="icon" aria-label="Verify code"><Search className="h-4 w-4" /></Button>
            </div>
          </form>
          <Button className="mt-3 w-full" onClick={scanning ? stopCamera : startCamera} leftIcon={<Camera className="h-4 w-4" />}>{scanning ? "Stop Scanning" : "Start Scanning"}</Button>
        </FormBlock>
        <FormBlock title="Scanner" icon={Camera}>
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-900">
            <video ref={video} className={cn("h-full w-full object-cover", !scanning && "hidden")} muted playsInline />
            {!scanning && <p className="px-6 text-center text-[13px] text-slate-300">Point the camera at a barcode or QR code</p>}
            <span className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-brand-500" aria-hidden />
          </div>
          {cameraError && <p role="alert" className="mt-2 text-xs text-[#b7791f]">{cameraError}</p>}
        </FormBlock>
        <FormBlock title="Verification Result" icon={CheckCircle2}>
          {result ? (
            <>
              <div className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px]", result.valid ? "border-[#cdeedb] bg-[#e8f7ee] text-[#1a7f46]" : "border-red-200 bg-red-50 text-red-700")}>
                {result.valid ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
                <div><p className="font-bold">{result.valid ? "Valid Item" : "Not Verified"}</p><p>{result.valid ? "Barcode/QR code successfully verified." : result.record ? `This code is ${String(result.record.status)}.` : "No item uses this code."}</p></div>
              </div>
              {result.product && (
                <dl className="mt-3 space-y-1.5 text-[13px]">
                  {[
                    ["Item Code", result.product.sku],
                    ["Description", result.product.name],
                    ["Category", result.product.categoryName],
                    ["UoM", result.product.unit],
                    ["On Hand", formatNumber(result.product.totalStock ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[100px_1fr] gap-2"><dt className="text-slate-600">{label}</dt><dd className="font-semibold">{value}</dd></div>
                  ))}
                  <div className="grid grid-cols-[100px_1fr] gap-2"><dt className="text-slate-600">Status</dt><dd><StatusBadge status={result.product.status} /></dd></div>
                </dl>
              )}
              {result.product && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/products/${result.product?.id}`)}>View Transaction History</Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-3.5 w-3.5" />}>Print Item Label</Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] text-slate-500">Scan or type a code to verify it.</p>
          )}
        </FormBlock>
      </div>
      <FormBlock title="Recent Scans" icon={History} className="mt-4" actions={<Button size="sm" variant="outline" disabled={!history.length} onClick={() => { setHistory([]); try { window.localStorage.removeItem(SCAN_HISTORY_KEY); } catch { /* ignore */ } }}>Clear History</Button>}>
        <table className="w-full text-[13px]">
          <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Date &amp; Time</th><th className={cell}>Code</th><th className={cell}>Description</th><th className={cell}>Type</th><th className={cell}>Result</th></tr></thead>
          <tbody className="divide-y divide-line">
            {history.map((entry, index) => (
              <tr key={`${entry.at}-${index}`}>
                <td className={cn(cell, "text-slate-500")}>{index + 1}</td>
                <td className={cell}>{formatDateTime(entry.at)}</td>
                <td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{entry.code}</td>
                <td className={cell}>{entry.description}</td>
                <td className={cell}><span className="flex items-center gap-1.5">{entry.type === "QR Code" ? <QrCode className="h-4 w-4" /> : <BarcodeIcon className="h-4 w-4" />}{entry.type}</span></td>
                <td className={cell}><Badge tone={entry.valid ? "success" : "danger"}>{entry.valid ? "Valid" : "Invalid"}</Badge></td>
              </tr>
            ))}
            {!history.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No scans yet.</td></tr>}
          </tbody>
        </table>
      </FormBlock>
    </div>
  );
}
