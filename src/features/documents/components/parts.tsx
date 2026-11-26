"use client";

import Link from "next/link";
import { UserRound, Warehouse as WarehouseIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { displayStatus, type DocumentDef } from "@/config/documents";
import { cn } from "@/lib/utils/cn";
import type { Warehouse } from "@/types/models";
import type { TransactionDocument } from "@/types/records";

/** Colours for type pills (issuance type, count type, adjustment type…). */
const TYPE_TONES: [RegExp, BadgeTone][] = [
  [/^stock in/, "success"],
  [/^stock out/, "danger"],
  [/^(ris|full)/, "info"],
  [/^ics/, "orange"],
  [/^(par|cycle)/, "purple"],
  [/^spot/, "success"],
  [/^(lost|damaged|condemn)/, "danger"],
  [/^(sale|transfer|donation)/, "orange"],
];

export function typeTone(value: string): BadgeTone {
  const v = value.toLowerCase();
  return TYPE_TONES.find(([pattern]) => pattern.test(v))?.[1] ?? "info";
}

export function TypePill({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const short = value.split(" – ")[0];
  return <Badge tone={typeTone(value)}>{short}</Badge>;
}

export function DocStatus({ def, doc }: { def: DocumentDef; doc: TransactionDocument }) {
  return <StatusBadge status={displayStatus(def, doc)} />;
}

/** Blue underlined document number, as in every mockup list. */
export function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={(event) => event.stopPropagation()} className="whitespace-nowrap font-semibold text-[#2f6fd6] underline underline-offset-2 hover:text-[#1d4fa3]">
      {children}
    </Link>
  );
}

/** Warehouse cell: small warehouse tile + bold code over the name. */
export function WarehouseCell({ warehouse, fallback }: { warehouse?: Warehouse; fallback?: string }) {
  if (!warehouse) return <span>{fallback ?? "—"}</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <WarehouseIcon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <span className="leading-tight">
        <span className="block font-bold">{warehouse.code}</span>
        <span className="block whitespace-nowrap text-xs text-slate-500">{warehouse.name}</span>
      </span>
    </span>
  );
}

export function PersonCell({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
      {name}
    </span>
  );
}

/** Read-only value box used in the transaction form headers (red text for the number). */
export function HeaderValue({ label, value, tone = "plain" }: { label: string; value: React.ReactNode; tone?: "plain" | "red" }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className={cn("rounded-md border border-line bg-white px-3 py-1.5 font-semibold", tone === "red" ? "text-brand-600" : "text-ink")}>{value}</span>
    </div>
  );
}

/** Pink "Total Amount" panel from the transaction forms. */
export function TotalAmount({ label = "Total Amount", value }: { label?: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-lg border border-[#f8d3d3] bg-[#fdeeee] px-4 py-3">
      <span className="text-sm font-bold text-ink">{label}</span>
      <span className="text-xl font-bold text-brand-600">{value}</span>
    </div>
  );
}

/** Label / value rows of a summary box. */
export function SummaryRows({ rows }: { rows: { label: string; value: React.ReactNode; tone?: "red" | "green" }[] }) {
  return (
    <dl className="space-y-2 text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-slate-600">{row.label}</dt>
          <dd className={cn("font-bold", row.tone === "red" && "text-red-600", row.tone === "green" && "text-[#1f9d55]")}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
