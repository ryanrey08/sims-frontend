"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Unauthorized } from "@/components/common/Unauthorized";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { getReportForm, REPORT_FORMS, type ReportFilter, type ReportFormDef } from "@/config/reportForms";
import { appConfig } from "@/config/app.config";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { usePermissions } from "@/hooks/usePermission";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { useToast } from "@/hooks/useToast";
import { exportToCsv } from "@/lib/utils/csv";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useGetSettingsQuery } from "@/services/api/endpoints/settingsApi";
import { useGetReportFormQuery } from "@/services/api/endpoints/reportFormsApi";
import type { FieldValue, ReportColumn } from "@/types/records";

const FILTER_META: Record<ReportFilter, { label: string; source?: string }> = {
  warehouseId: { label: "Warehouse", source: "warehouses" },
  productId: { label: "Item", source: "products" },
  supplierId: { label: "Supplier", source: "suppliers" },
  employeeId: { label: "Accountable Officer", source: "employees" },
  propertyId: { label: "Property", source: "properties" },
  from: { label: "From" },
  to: { label: "To" },
};

function formatCell(value: FieldValue | undefined, format: ReportColumn["format"]) {
  if (value === null || value === undefined || value === "") return "";
  if (format === "currency") return formatCurrency(Number(value));
  if (format === "number") return formatNumber(Number(value));
  if (format === "date") return formatDate(String(value));
  if (format === "datetime") return formatDateTime(String(value));
  if (format === "status") return <StatusBadge status={String(value)} />;
  return String(value);
}

function FilterControl({ filter, value, onChange }: { filter: ReportFilter; value: string; onChange: (value: string) => void }) {
  const meta = FILTER_META[filter];
  const { options } = useReferenceOptions(meta.source);
  const id = `report-${filter}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{meta.label}</label>
      {meta.source ? (
        <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} options={options} placeholder={`All / select ${meta.label.toLowerCase()}`} />
      ) : (
        <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function ReportForm({ def }: { def: ReportFormDef }) {
  const toast = useToast();
  const { data: settings } = useGetSettingsQuery();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const missing = (def.required ?? []).filter((key) => !applied[key]);
  const { data, isFetching, error, refetch } = useGetReportFormQuery({ code: def.code, filters: applied }, { skip: missing.length > 0 });

  return (
    <>
      <PageHeader
        icon={FileSpreadsheet}
        title={def.title}
        description={def.description}
        actions={
          <>
            <Button variant="outline" disabled={!data?.rows.length} onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
            <Button
              variant="outline"
              disabled={!data?.rows.length}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                if (!data) return;
                exportToCsv(def.code, data.rows, data.columns.map((column) => ({ header: column.label, value: (row) => (row[column.key] === null ? "" : String(row[column.key])) })));
                toast.success("Export ready", `${data.title} exported to CSV.`);
              }}
            >
              Export CSV
            </Button>
          </>
        }
      />
      {def.filters.length > 0 && (
        <Card className="mb-6 print:hidden">
          <form
            className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)));
            }}
          >
            {def.filters.map((filter) => (
              <FilterControl key={filter} filter={filter} value={draft[filter] ?? ""} onChange={(value) => setDraft((current) => ({ ...current, [filter]: value }))} />
            ))}
            <Button type="submit">Generate</Button>
          </form>
        </Card>
      )}
      <Card>
        {missing.length > 0 ? (
          <EmptyState icon={FileSpreadsheet} title="Choose what to report on" description={`Select ${missing.map((key) => FILTER_META[key].label.toLowerCase()).join(" and ")} above, then click Generate.`} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data ? (
          <div className="space-y-3 p-6">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-8" />)}</div>
        ) : (
          <CardContent className={isFetching ? "opacity-60" : undefined}>
            <div className="mb-5 text-center">
              <p className="text-xs uppercase tracking-wider text-muted">{settings?.organizationName ?? appConfig.name}</p>
              <h2 className="mt-1 text-lg font-bold uppercase">{data.title}</h2>
              {data.subtitle && <p className="text-sm text-muted">{data.subtitle}</p>}
            </div>
            {data.meta && (
              <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {data.meta.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted">{item.label}</dt>
                    <dd className="font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {data.rows.length === 0 ? (
              <EmptyState title="No records for these filters" />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">{data.title}</caption>
                  <thead className="bg-slate-100/80">
                    <tr>
                      {data.columns.map((column) => (
                        <th key={column.key} scope="col" className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-700 ${column.align === "right" ? "text-right" : "text-left"}`}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, index) => (
                      <tr key={index} className="border-t border-line">
                        {data.columns.map((column) => (
                          <td key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right tabular-nums" : ""}`}>
                            {formatCell(row[column.key], column.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {data.totals && (
                    <tfoot className="border-t-2 border-line bg-slate-50 font-semibold">
                      <tr>
                        {data.columns.map((column, index) => (
                          <td key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right tabular-nums" : ""}`}>
                            {index === 0 ? "TOTAL" : formatCell(data.totals?.[column.key], column.format)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
            {data.signatories && (
              <div className="mt-10 grid gap-8 sm:grid-cols-3">
                {data.signatories.map((person) => (
                  <div key={person.label} className="text-center text-sm">
                    <p className="text-left text-xs text-muted">{person.label}:</p>
                    <p className="mt-8 border-t border-ink pt-1 font-semibold uppercase">{person.name}</p>
                    <p className="text-xs text-muted">{person.position}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </>
  );
}

export function ReportFormView({ code }: { code: string }) {
  const def = getReportForm(code);
  useBreadcrumbLabel(code, def?.title);
  if (!def) return <Unauthorized />;
  return <ReportForm key={def.code} def={def} />;
}

/** Index of every form, report and monitoring view, grouped as in the SIMS design. */
export function ReportFormsIndexView() {
  const { can } = usePermissions();
  const groups = [...new Set(REPORT_FORMS.map((form) => form.group))];
  return (
    <>
      <PageHeader icon={FileSpreadsheet} title="Forms and Reports" description="Government forms, inventory monitoring and property reports generated from live data." />
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{group}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {REPORT_FORMS.filter((form) => form.group === group && can(form.permission)).map((form) => (
                <li key={form.code}>
                  <Link href={`/forms/${form.code}`} className="flex h-full items-start gap-3 rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
                    <FileSpreadsheet className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" strokeWidth={1.6} />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{form.title}</span>
                      <span className="block text-xs text-muted">{form.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
