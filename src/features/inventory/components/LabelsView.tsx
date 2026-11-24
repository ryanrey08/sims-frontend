"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Tabs } from "@/components/ui/Tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/utils/format";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import type { Product } from "@/types/models";

// Code 39 patterns: n = narrow, w = wide; bars and spaces alternate starting with a bar.
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
  G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
  O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
  W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

/** Dependency-free Code 39 barcode as SVG. */
function Barcode({ value, height = 44 }: { value: string; height?: number }) {
  const text = `*${value.toUpperCase().replace(/[^0-9A-Z\-. ]/g, "")}*`;
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const char of text) {
    const pattern = CODE39[char];
    if (!pattern) continue;
    [...pattern].forEach((unit, index) => {
      const width = unit === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += 1;
  }
  return (
    <svg viewBox={`0 0 ${x} ${height}`} className="h-11 w-full" preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`}>
      {bars.map((bar, index) => <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#111" />)}
    </svg>
  );
}

function QrImage({ value }: { value: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: "svg", margin: 0, width: 96 }).then((markup) => active && setSvg(markup));
    return () => {
      active = false;
    };
  }, [value]);
  return <span className="block h-24 w-24" role="img" aria-label={`QR code for ${value}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Label({ product, mode }: { product: Product; mode: "barcode" | "qr" }) {
  return (
    <div className="flex break-inside-avoid flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center">
      <p className="line-clamp-2 text-xs font-semibold text-ink">{product.name}</p>
      {mode === "barcode" ? <Barcode value={product.sku} /> : <QrImage value={JSON.stringify({ sku: product.sku, name: product.name, unit: product.unit })} />}
      <p className="font-mono text-[11px] tracking-widest">{product.sku}</p>
      <p className="text-[10px] text-muted">{product.unit} · {formatCurrency(product.unitCost)}</p>
    </div>
  );
}

/** "Barcode and QR Code" screen: choose items and print labels. */
export function LabelsView() {
  const [mode, setMode] = useState<"barcode" | "qr">("barcode");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const { data } = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name", search: debounced || undefined });
  const [selected, setSelected] = useState<string[]>([]);
  const products = useMemo(() => data?.data ?? [], [data]);
  const chosen = products.filter((product) => selected.includes(product.id));

  return (
    <>
      <PageHeader
        icon={QrCode}
        title="Barcode and QR Code"
        description="Generate and print barcode or QR labels for items."
        actions={<Button onClick={() => window.print()} disabled={!chosen.length} leftIcon={<Printer className="h-4 w-4" />}>Print {chosen.length || ""} labels</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="print:hidden">
          <CardHeader title="Select items" description={`${selected.length} selected`} actions={<Button size="sm" variant="ghost" onClick={() => setSelected(selected.length ? [] : products.map((product) => product.id))}>{selected.length ? "Clear" : "Select all"}</Button>} />
          <div className="border-b border-line p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search item or SKU" label="Search items" />
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {products.map((product) => (
              <li key={product.id} className="px-4 py-2.5">
                <Checkbox
                  id={`label-${product.id}`}
                  checked={selected.includes(product.id)}
                  onChange={(event) => setSelected((current) => (event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id)))}
                  label={product.name}
                  description={product.sku}
                />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="xl:col-span-2">
          <Tabs label="Label type" className="px-3 print:hidden" value={mode} onChange={setMode} items={[{ value: "barcode", label: "Barcode (Code 39)" }, { value: "qr", label: "QR Code" }]} />
          {chosen.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted">Select items on the left to preview their labels.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {chosen.map((product) => <Label key={product.id} product={product} mode={mode} />)}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
