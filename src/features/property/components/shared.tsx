"use client";

import { QrImage } from "@/components/labels/Codes";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { MasterRecord } from "@/types/records";

export const head = "bg-[#f3f4f6] text-left text-xs font-bold text-ink";
export const cell = "px-3 py-2.5";
export const text = (record: MasterRecord | undefined, field: string) => {
  const label = record?.[`${field}__label`];
  const value = label ?? record?.[field];
  return value === null || value === undefined || value === "" ? "—" : String(value);
};

/** Stacked label + value rows used by the details panels. */
export function KeyValues({ rows, labelWidth = "w-36" }: { rows: [string, React.ReactNode][]; labelWidth?: string }) {
  return (
    <dl className="space-y-1.5 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className={cn("shrink-0 text-slate-600", labelWidth)}>{label}</dt>
          <dd className="min-w-0 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-hand "Property Details" panel (p51): QR code and the key fields. */
export function PropertyDetailsPanel({ record, onEdit }: { record?: MasterRecord; onEdit?: () => void }) {
  if (!record) return <p className="text-[13px] text-slate-500">Select a property to see its details.</p>;
  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <QrImage value={String(record.propertyNo)} size={88} />
        <div>
          <p className="text-base font-bold text-[#2f6fd6]">{String(record.propertyNo)}</p>
          <p className="text-[13px]">{String(record.description)}</p>
        </div>
      </div>
      <KeyValues
        rows={[
          ["Category", text(record, "category")],
          ["Serial No.", text(record, "serialNo")],
          ["Acquisition Date", formatDate(String(record.acquisitionDate ?? ""))],
          ["Acquisition Cost", formatCurrency(Number(record.acquisitionCost ?? 0))],
          ["Location", text(record, "locationId")],
          ["Status", <StatusBadge key="s" status={String(record.status)} />],
          ["Condition", text(record, "condition")],
          ["Custodian", text(record, "accountableId")],
          ["Remarks", text(record, "remarks")],
        ]}
      />
      {onEdit && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onEdit}>
          Edit Property
        </Button>
      )}
    </div>
  );
}

export function SimplePager({ page, total, pageSize = 10, onPage }: { page: number; total: number; pageSize?: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[13px]">
      <span>
        Showing {total ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} records
      </span>
      <span className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => onPage(page - 1)}>Previous</Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, index) => index + 1).map((number) => (
          <button key={number} type="button" onClick={() => onPage(number)} aria-current={number === page ? "page" : undefined} className={cn("h-8 min-w-8 rounded-md border px-2", number === page ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>{number}</button>
        ))}
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </span>
    </div>
  );
}
