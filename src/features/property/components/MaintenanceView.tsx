"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Eye, FileText, History, LayoutDashboard, Pencil, Plus, Search, Settings, Wrench } from "lucide-react";
import { PieChartView } from "@/components/charts";
import { Can } from "@/components/common/Can";
import { FilterSelect } from "@/components/common/FilterSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard, StatGrid } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormBlock } from "@/components/forms/HField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber, todayISO } from "@/lib/utils/format";
import { useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import type { MasterRecord } from "@/types/records";
import { MaintenanceRequestModal, PriorityPill, isOverdue, woStatus } from "./maintenance";
import { SimplePager, cell, head } from "./shared";

type Tab = "dashboard" | "requests" | "work-orders" | "preventive" | "history" | "settings";
const TABS: { value: Tab; label: string; icon: typeof Wrench }[] = [
  { value: "dashboard", label: "Maintenance Dashboard", icon: LayoutDashboard },
  { value: "requests", label: "Maintenance Request", icon: ClipboardList },
  { value: "work-orders", label: "Work Orders", icon: Wrench },
  { value: "preventive", label: "Preventive Maintenance", icon: CalendarClock },
  { value: "history", label: "Maintenance History", icon: History },
  { value: "settings", label: "Settings", icon: Settings },
];
const SETTINGS_KEY = "sims.maintenance.settings";

function thisMonth(date: unknown) {
  const value = String(date ?? "");
  return value.slice(0, 7) === todayISO().slice(0, 7);
}

/** "Maintenance" screens (p67, p71): dashboard, requests, work orders, preventive maintenance, history. */
function Maintenance() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("dashboard");
  const { data, isLoading } = useGetMasterRecordsQuery({ resource: "work-orders", params: { pageSize: 1000, sortBy: "requestDate", sortOrder: "desc" } });
  const [modal, setModal] = useState<{ kind: "request" | "work-order"; propertyId?: string; record?: MasterRecord } | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState({ routeTo: "ICT Head", targetDays: "7", pmInterval: "6" });
  const all = useMemo(() => data?.data ?? [], [data]);

  // ?new=<propertyId> (from the property list) or ?new=1 opens a new request.
  useEffect(() => {
    const value = params.get("new");
    if (value) setModal({ kind: "request", propertyId: value === "1" ? undefined : value });
  }, [params]);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch {
      // Defaults apply.
    }
  }, []);

  const scoped = all.filter((record) => {
    if (tab === "requests") return record.status === "pending";
    if (tab === "work-orders") return Boolean(record.woNo);
    if (tab === "preventive") return record.type === "Preventive" || record.type === "Scheduled";
    if (tab === "history") return record.status === "completed" || record.status === "cancelled";
    return true;
  });
  const rows = scoped.filter(
    (record) =>
      (!filters.status || woStatus(record) === filters.status) &&
      (!filters.priority || record.priority === filters.priority) &&
      (!filters.type || record.type === filters.type) &&
      (!search || `${record.woNo ?? ""} ${record.requestNo} ${record.propertyId__label ?? ""} ${record.issue}`.toLowerCase().includes(search.toLowerCase())),
  );
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const workOrders = all.filter((record) => record.woNo);
  const byStatus = ["completed", "in-progress", "scheduled", "pending", "overdue"].map((status) => ({ label: status === "pending" ? "Pending" : status === "in-progress" ? "In Progress" : status[0].toUpperCase() + status.slice(1), value: all.filter((record) => woStatus(record) === status).length })).filter((point) => point.value > 0);
  const byType = ["Corrective", "Preventive", "Scheduled", "Emergency"].map((type) => ({ label: type, value: workOrders.filter((record) => record.type === type).length })).filter((point) => point.value > 0);
  const upcoming = all.filter((record) => (record.type === "Preventive" || record.type === "Scheduled") && record.status !== "completed").sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate))).slice(0, 5);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const dueThisWeek = workOrders.filter((record) => record.status !== "completed" && String(record.targetDate) <= weekEnd).slice(0, 5);
  const woTab = tab === "work-orders";

  return (
    <>
      <PageHeader icon={Wrench} title="Maintenance" description="Plan, request, assign, and track corrective and preventive maintenance of property and equipment." />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 bg-brand-600 px-4 py-3 text-white"><Wrench className="h-5 w-5" /><h2 className="text-base font-bold">Maintenance</h2></div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Maintenance sections">
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => { setTab(item.value); setPage(1); }} className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold", tab === item.value ? "border-brand-600 bg-white text-brand-600" : "border-line text-slate-700 hover:bg-slate-50")}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab === "settings" ? (
            <FormBlock title="Maintenance Settings" icon={Settings}>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Default Route To<Select value={settings.routeTo} onChange={(event) => setSettings((current) => ({ ...current, routeTo: event.target.value }))} options={["ICT Head", "Facilities Head", "Motor Pool Supervisor", "Property Custodian"].map((value) => ({ label: value, value }))} /></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">Default Target (days)<Input type="number" min={1} value={settings.targetDays} onChange={(event) => setSettings((current) => ({ ...current, targetDays: event.target.value }))} /></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">PM Interval (months)<Input type="number" min={1} value={settings.pmInterval} onChange={(event) => setSettings((current) => ({ ...current, pmInterval: event.target.value }))} /></label>
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  try {
                    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                    toast.success("Settings saved", "Maintenance defaults were updated on this device.");
                  } catch {
                    toast.error("Could not save settings", "Browser storage is not available.");
                  }
                }}
              >
                Save Settings
              </Button>
            </FormBlock>
          ) : (
            <>
              <StatGrid columns={5}>
                {woTab ? (
                  <>
                    <StatCard label="Total Work Orders" value={formatNumber(workOrders.length)} icon={Wrench} accent="blue" loading={isLoading} />
                    <StatCard label="Open" value={formatNumber(workOrders.filter((record) => record.status === "scheduled").length)} icon={ClipboardList} accent="purple" loading={isLoading} />
                    <StatCard label="In Progress" value={formatNumber(workOrders.filter((record) => record.status === "in-progress").length)} icon={CalendarClock} accent="yellow" loading={isLoading} />
                    <StatCard label="Completed" value={formatNumber(workOrders.filter((record) => record.status === "completed").length)} icon={CheckCircle2} accent="green" loading={isLoading} />
                    <StatCard label="Overdue" value={formatNumber(workOrders.filter(isOverdue).length)} icon={AlertTriangle} accent="pink" loading={isLoading} />
                  </>
                ) : (
                  <>
                    <StatCard label="Open Requests" value={formatNumber(all.filter((record) => record.status === "pending").length)} icon={ClipboardList} accent="blue" loading={isLoading} />
                    <StatCard label="Active Work Orders" value={formatNumber(all.filter((record) => record.status === "in-progress").length)} icon={Wrench} accent="yellow" loading={isLoading} />
                    <StatCard label="Completed (This Month)" value={formatNumber(all.filter((record) => record.status === "completed" && thisMonth(record.completedDate)).length)} icon={CheckCircle2} accent="green" loading={isLoading} />
                    <StatCard label="Scheduled PM" value={formatNumber(all.filter((record) => record.status === "scheduled").length)} icon={CalendarClock} accent="purple" loading={isLoading} />
                    <StatCard label="Overdue" value={formatNumber(all.filter(isOverdue).length)} icon={AlertTriangle} accent="pink" loading={isLoading} />
                  </>
                )}
              </StatGrid>
              {(tab === "dashboard" || woTab) && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormBlock title={woTab ? "Work Orders by Type" : "Maintenance Requests by Status"} icon={LayoutDashboard}>
                    <p className="-mt-2 mb-1 text-xs text-slate-500">{woTab ? workOrders.length : all.length} Total</p>
                    <PieChartView data={woTab ? byType : byStatus} height={200} />
                  </FormBlock>
                  <FormBlock title={woTab ? "Work Orders Due This Week" : "Upcoming Preventive Maintenance"} icon={CalendarClock}>
                    <table className="w-full text-[13px]">
                      <thead><tr className={head}><th className={cell}>{woTab ? "WO No." : "Due Date"}</th><th className={cell}>{woTab ? "Due Date" : "Property No."}</th><th className={cell}>Description</th><th className={cell}>{woTab ? "Status" : "Maintenance Type"}</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {(woTab ? dueThisWeek : upcoming).map((record) => (
                          <tr key={record.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/property/maintenance/${record.id}`)}>
                            <td className={cn(cell, "whitespace-nowrap", woTab && "font-semibold text-[#2f6fd6]")}>{woTab ? String(record.woNo) : formatDate(String(record.targetDate))}</td>
                            <td className={cn(cell, "whitespace-nowrap")}>{woTab ? formatDate(String(record.targetDate)) : String(record.propertyId__label ?? "").split(" – ")[0]}</td>
                            <td className={cell}>{String(record.issue)}</td>
                            <td className={cell}>{woTab ? <StatusBadge status={woStatus(record)} /> : String(record.type)}</td>
                          </tr>
                        ))}
                        {!(woTab ? dueThisWeek : upcoming).length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Nothing scheduled.</td></tr>}
                      </tbody>
                    </table>
                  </FormBlock>
                </div>
              )}
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                <FilterSelect layout="stacked" label="Status" allLabel="All Status" value={draft.status ?? ""} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} options={[{ label: "Pending", value: "pending" }, { label: "Scheduled", value: "scheduled" }, { label: "In Progress", value: "in-progress" }, { label: "Completed", value: "completed" }, { label: "Overdue", value: "overdue" }]} />
                <FilterSelect layout="stacked" label="Priority" allLabel="All Priorities" value={draft.priority ?? ""} onChange={(value) => setDraft((current) => ({ ...current, priority: value }))} options={["High", "Medium", "Low"].map((value) => ({ label: value, value }))} />
                <FilterSelect layout="stacked" label="Type" allLabel="All Types" value={draft.type ?? ""} onChange={(value) => setDraft((current) => ({ ...current, type: value }))} options={["Corrective", "Preventive", "Scheduled", "Emergency"].map((value) => ({ label: value, value }))} />
                <div className="flex min-w-56 flex-1 flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700">Search</span>
                  <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search WO / request no., property, issue..." label="Search maintenance" />
                </div>
                <Button leftIcon={<Search className="h-4 w-4" />} onClick={() => { setFilters(draft); setPage(1); }}>Search</Button>
                <Can permission={PERMISSIONS.propertyManage}>
                  <Button className="lg:ml-auto" onClick={() => setModal({ kind: woTab ? "work-order" : "request" })} leftIcon={<Plus className="h-4 w-4" />}>{woTab ? "New Work Order" : "New Maintenance Request"}</Button>
                </Can>
              </div>
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-[13px]">
                    <thead>
                      <tr className={head}>
                        <th className={cell}>{woTab ? "WO No." : "WO / Request No."}</th>
                        {woTab ? <th className={cell}>Request No.</th> : <th className={cell}>Request Date</th>}
                        <th className={cell}>Property No.</th><th className={cell}>Description</th><th className={cell}>Type</th><th className={cell}>Priority</th><th className={cell}>Status</th><th className={cell}>Assigned To</th>
                        {woTab && <th className={cell}>Start Date</th>}
                        <th className={cell}>Target Date</th><th className={cn(cell, "text-center")}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((record) => (
                        <tr key={record.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/property/maintenance/${record.id}`)}>
                          <td className={cn(cell, "whitespace-nowrap font-semibold text-[#2f6fd6] underline underline-offset-2")}>{String(record.woNo ?? record.requestNo)}</td>
                          <td className={cn(cell, "whitespace-nowrap")}>{woTab ? String(record.requestNo) : formatDate(String(record.requestDate))}</td>
                          <td className={cn(cell, "whitespace-nowrap")}>{String(record.propertyId__label ?? "").split(" – ")[0]}</td>
                          <td className={cell}>{String(record.issue)}</td>
                          <td className={cell}>{String(record.type)}</td>
                          <td className={cell}><PriorityPill value={record.priority} /></td>
                          <td className={cell}><StatusBadge status={woStatus(record)} /></td>
                          <td className={cell}>{String(record.assignedTo ?? "—")}</td>
                          {woTab && <td className={cn(cell, "whitespace-nowrap")}>{formatDate(String(record.startDate ?? ""))}</td>}
                          <td className={cn(cell, "whitespace-nowrap")}>{formatDate(String(record.targetDate ?? ""))}</td>
                          <td className={cell} onClick={(event) => event.stopPropagation()}>
                            <span className="flex justify-center gap-1">
                              <button type="button" aria-label={`View ${String(record.woNo ?? record.requestNo)}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={() => router.push(`/property/maintenance/${record.id}`)}><Eye className="h-4 w-4" /></button>
                              {record.status !== "completed" && (
                                <Can permission={PERMISSIONS.propertyManage}>
                                  <button type="button" aria-label={record.woNo ? "Edit work order" : "Create work order"} title={record.woNo ? "Edit work order" : "Create work order"} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-slate-50" onClick={() => setModal({ kind: "work-order", record })}>{record.woNo ? <Pencil className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</button>
                                </Can>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!pageRows.length && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">{isLoading ? "Loading…" : "No maintenance records match the filters."}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <SimplePager page={page} total={rows.length} onPage={setPage} />
              </div>
            </>
          )}
        </div>
      </Card>
      <MaintenanceRequestModal
        open={Boolean(modal)}
        kind={modal?.kind ?? "request"}
        propertyId={modal?.propertyId}
        record={modal?.record}
        onClose={() => {
          setModal(null);
          if (params.get("new")) router.replace("/property/maintenance");
        }}
        onDone={(record) => {
          setModal(null);
          router.push(`/property/maintenance/${record.id}`);
        }}
      />
    </>
  );
}

export function MaintenanceView() {
  return (
    <Suspense>
      <Maintenance />
    </Suspense>
  );
}
