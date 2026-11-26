"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CheckCircle2, ClipboardList, FileText, History, Landmark, ListChecks, Paperclip, Pencil, Plus, Printer, Wrench, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormBlock } from "@/components/forms/HField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { useGetMasterRecordQuery, useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import type { MasterRecord } from "@/types/records";
import { Attachments } from "@/features/documents/components/Attachments";
import { CompleteWorkOrderModal, MaintenanceRequestModal, PriorityPill, parseJson, useWorkOrderActions, woStatus, type Activity, type Part, type Task } from "./maintenance";
import { KeyValues, cell, head } from "./shared";

type Tab = "details" | "tasks" | "costs" | "attachments" | "activity";
const TABS: { value: Tab; label: string; icon: typeof Wrench }[] = [
  { value: "details", label: "Work Order Details", icon: FileText },
  { value: "tasks", label: "Tasks & Parts", icon: ListChecks },
  { value: "costs", label: "Costs & Charges", icon: Banknote },
  { value: "attachments", label: "Attachments", icon: Paperclip },
  { value: "activity", label: "Activity Log", icon: History },
];

/** Work order detail with its five tabs (p73–p77). */
function WorkOrder({ record }: { record: MasterRecord }) {
  const router = useRouter();
  const toast = useToast();
  const { update, saving } = useWorkOrderActions();
  const [tab, setTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", assignedTo: "", estimatedHours: "1" });
  const [newPart, setNewPart] = useState({ description: "", quantity: "1", unitCost: "0" });
  const { data: property } = useGetMasterRecordQuery({ resource: "properties", id: String(record.propertyId) });
  const tasks = parseJson<Task[]>(record.tasks, []);
  const parts = parseJson<Part[]>(record.parts, []);
  const activity = parseJson<Activity[]>(record.activity, []);
  const labor = Number(record.laborCost ?? 0);
  const partsCost = parts.reduce((sum, part) => sum + part.quantity * part.unitCost, 0) || Number(record.partsCost ?? 0);
  const other = Number(record.otherCost ?? 0);
  const total = labor + partsCost + other;
  const open = record.status !== "completed" && record.status !== "cancelled";
  const number = String(record.woNo ?? record.requestNo);

  const save = async (changes: Record<string, string | number | null>, type: string, details: string) => {
    try {
      await update(record, changes, { type, details });
      toast.success("Work order updated", details);
    } catch (error) {
      toast.error("Could not update the work order", error);
    }
  };

  const timeline = [
    { label: "Work Order Created", done: true, at: String(record.requestDate) },
    { label: "In Progress", done: ["in-progress", "completed"].includes(String(record.status)), at: String(record.startDate ?? "") },
    { label: "For Verification", done: record.status === "completed", at: "" },
    { label: "Completed", done: record.status === "completed", at: String(record.completedDate ?? "") },
  ];

  return (
    <>
      <PageHeader icon={Wrench} title="Maintenance" description="Work order details, tasks, costs and activity." />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-600 px-4 py-3 text-white">
          <h2 className="flex items-center gap-2 text-base font-bold"><Wrench className="h-5 w-5" />{record.woNo ? "Work Order" : "Maintenance Request"} – {number}</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white px-1"><StatusBadge status={woStatus(record)} /></span>
            <Button size="sm" variant="outline" className="border-white/60 bg-transparent text-white hover:bg-white/15" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Work order sections">
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold", tab === item.value ? "border-brand-600 text-brand-600" : "border-line text-slate-700 hover:bg-slate-50")}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {tab === "details" && (
            <>
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
                <FormBlock title="Work Order Information" icon={FileText}>
                  <KeyValues rows={[["Work Order No.", record.woNo ? String(record.woNo) : "Not yet assigned"], ["Request No.", String(record.requestNo)], ["WO Date", formatDate(String(record.requestDate))], ["Type", String(record.type)], ["Priority", <PriorityPill key="p" value={record.priority} />], ["Assigned To", String(record.assignedTo ?? "—")], ["Technician", String(record.technician ?? "—")], ["Target Date", formatDate(String(record.targetDate ?? ""))]]} />
                </FormBlock>
                <FormBlock title="Property Details" icon={Landmark}>
                  <div className="flex gap-3">
                    {property?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(property.imageUrl)} alt="" className="h-20 w-20 rounded-md border border-line object-cover" />
                    ) : null}
                    <KeyValues labelWidth="w-28" rows={[["Property No.", String(property?.propertyNo ?? "—")], ["Description", String(property?.description ?? "—")], ["Category", String(property?.category ?? "—")], ["Location", String(property?.locationId__label ?? "—")], ["Custodian", String(property?.accountableId__label ?? "—")]]} />
                  </div>
                </FormBlock>
                <FormBlock title="Work Order Timeline" icon={History}>
                  <ol className="space-y-3">
                    {timeline.map((step) => (
                      <li key={step.label} className="flex items-start gap-3 text-[13px]">
                        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", step.done ? "bg-[#1f9d55] text-white" : "border border-slate-300 bg-white text-slate-400")}>{step.done ? <CheckCircle2 className="h-4 w-4" /> : null}</span>
                        <span><b className="block">{step.label}</b><span className="text-xs text-slate-500">{step.done && step.at ? formatDate(step.at) : "Pending"}</span></span>
                      </li>
                    ))}
                  </ol>
                </FormBlock>
              </div>
              <FormBlock title="Maintenance Request Details" icon={ClipboardList}>
                <KeyValues rows={[["Issue / Problem", String(record.issue)], ["Description", String(record.details ?? "—")], ["Requested By", String(record.requestedBy)], ["Department", String(record.department)], ["Routed To", String(record.routeTo ?? "—")]]} />
              </FormBlock>
              <TasksTable tasks={tasks} />
              <div className="grid gap-4 lg:grid-cols-2">
                <FormBlock title="Estimated Cost" icon={Banknote}>
                  <CostSummary labor={labor} parts={partsCost} other={other} total={total} />
                </FormBlock>
                <FormBlock title="Completion" icon={CheckCircle2}>
                  <KeyValues rows={[["Actual Start Date", formatDate(String(record.startDate ?? ""))], ["Actual Completion Date", formatDate(String(record.completedDate ?? ""))], ["Completion Remarks", String(record.completionRemarks ?? "—")]]} />
                </FormBlock>
              </div>
            </>
          )}

          {tab === "tasks" && (
            <>
              <TasksTable tasks={tasks} />
              {open && (
                <Can permission={PERMISSIONS.propertyManage}>
                  <form
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!newTask.task.trim()) return toast.error("Enter the task", "Describe the task or activity.");
                      void save({ tasks: JSON.stringify([...tasks, { task: newTask.task.trim(), assignedTo: newTask.assignedTo || String(record.technician ?? "—"), estimatedHours: Number(newTask.estimatedHours) || 0, actualHours: 0, status: "Pending" }]) }, "Task Added", `Task added: ${newTask.task.trim()}`);
                      setNewTask({ task: "", assignedTo: "", estimatedHours: "1" });
                    }}
                  >
                    <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-semibold">Task / Activity<Input value={newTask.task} onChange={(event) => setNewTask((current) => ({ ...current, task: event.target.value }))} /></label>
                    <label className="flex flex-col gap-1 text-xs font-semibold">Assigned To<Input value={newTask.assignedTo} onChange={(event) => setNewTask((current) => ({ ...current, assignedTo: event.target.value }))} /></label>
                    <label className="flex w-28 flex-col gap-1 text-xs font-semibold">Est. Hours<Input type="number" min={0} value={newTask.estimatedHours} onChange={(event) => setNewTask((current) => ({ ...current, estimatedHours: event.target.value }))} /></label>
                    <Button type="submit" variant="outline" className="border-brand-600 text-brand-600" loading={saving} leftIcon={<Plus className="h-4 w-4" />}>Add Task</Button>
                  </form>
                </Can>
              )}
              <FormBlock title="Parts / Materials" icon={ListChecks}>
                <table className="w-full text-[13px]">
                  <thead><tr className={head}><th className={cell}>Item Code</th><th className={cell}>Item Description</th><th className={cell}>Unit</th><th className={cn(cell, "text-right")}>Quantity</th><th className={cn(cell, "text-right")}>Unit Cost</th><th className={cn(cell, "text-right")}>Total Cost</th><th className={cell}>Source</th><th className={cell}>Status</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {parts.map((part, index) => (
                      <tr key={index}><td className={cn(cell, "font-semibold text-[#2f6fd6]")}>{part.itemCode}</td><td className={cell}>{part.description}</td><td className={cell}>{part.unit}</td><td className={cn(cell, "text-right")}>{part.quantity}</td><td className={cn(cell, "text-right")}>{formatCurrency(part.unitCost)}</td><td className={cn(cell, "text-right font-semibold")}>{formatCurrency(part.quantity * part.unitCost)}</td><td className={cell}>{part.source}</td><td className={cell}><StatusBadge status={part.status === "Issued" ? "issued" : "pending"} label={part.status} /></td></tr>
                    ))}
                    {!parts.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No parts recorded.</td></tr>}
                  </tbody>
                </table>
                {open && (
                  <Can permission={PERMISSIONS.propertyManage}>
                    <form
                      className="mt-3 flex flex-wrap items-end gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!newPart.description.trim()) return toast.error("Enter the part", "Describe the part or material.");
                        void save({ parts: JSON.stringify([...parts, { itemCode: "—", description: newPart.description.trim(), unit: "pc", quantity: Number(newPart.quantity) || 1, unitCost: Number(newPart.unitCost) || 0, source: "Purchase", status: "Requested" }]) }, "Part Added", `Part added: ${newPart.description.trim()}`);
                        setNewPart({ description: "", quantity: "1", unitCost: "0" });
                      }}
                    >
                      <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-semibold">Part / Material<Input value={newPart.description} onChange={(event) => setNewPart((current) => ({ ...current, description: event.target.value }))} /></label>
                      <label className="flex w-24 flex-col gap-1 text-xs font-semibold">Quantity<Input type="number" min={1} value={newPart.quantity} onChange={(event) => setNewPart((current) => ({ ...current, quantity: event.target.value }))} /></label>
                      <label className="flex w-32 flex-col gap-1 text-xs font-semibold">Unit Cost (₱)<Input type="number" min={0} step="0.01" value={newPart.unitCost} onChange={(event) => setNewPart((current) => ({ ...current, unitCost: event.target.value }))} /></label>
                      <Button type="submit" variant="outline" className="border-brand-600 text-brand-600" loading={saving} leftIcon={<Plus className="h-4 w-4" />}>Add Part</Button>
                    </form>
                  </Can>
                )}
              </FormBlock>
              <div className="flex items-center justify-between rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-4 py-3"><span className="text-sm font-bold">Total Estimated Cost</span><span className="text-xl font-bold text-[#2f6fd6]">{formatCurrency(total)}</span></div>
            </>
          )}

          {tab === "costs" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <FormBlock title="Labor, Parts and Other Charges" icon={Banknote}>
                <form
                  className="grid gap-3 sm:grid-cols-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void save({ laborCost: Number(form.get("laborCost")) || 0, otherCost: Number(form.get("otherCost")) || 0, partsCost }, "Cost Added", "Costs and charges updated");
                  }}
                >
                  <label className="flex flex-col gap-1 text-xs font-semibold">Labor Cost (₱)<Input name="laborCost" type="number" min={0} step="0.01" defaultValue={labor} disabled={!open} /></label>
                  <label className="flex flex-col gap-1 text-xs font-semibold">Parts &amp; Materials (₱)<Input type="number" value={partsCost} readOnly className="bg-slate-100" /></label>
                  <label className="flex flex-col gap-1 text-xs font-semibold">Other Charges (₱)<Input name="otherCost" type="number" min={0} step="0.01" defaultValue={other} disabled={!open} /></label>
                  {open && <Can permission={PERMISSIONS.propertyManage}><Button type="submit" loading={saving} className="sm:col-span-3 sm:w-fit">Save Costs</Button></Can>}
                </form>
              </FormBlock>
              <FormBlock title="Cost Summary" icon={Banknote}>
                <CostSummary labor={labor} parts={partsCost} other={other} total={total} />
              </FormBlock>
            </div>
          )}

          {tab === "attachments" && (
            <FormBlock title="Attachments" icon={Paperclip}>
              <Attachments value={parseJson(record.attachments, [])} readOnly />
            </FormBlock>
          )}

          {tab === "activity" && (
            <table className="w-full text-[13px]">
              <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Date &amp; Time</th><th className={cell}>Activity Type</th><th className={cell}>Details / Description</th><th className={cell}>Performed By</th><th className={cell}>Remarks</th></tr></thead>
              <tbody className="divide-y divide-line">
                {[...activity].reverse().map((entry, index) => (
                  <tr key={index}><td className={cn(cell, "text-slate-500")}>{index + 1}</td><td className={cn(cell, "whitespace-nowrap")}>{formatDateTime(entry.at)}</td><td className={cell}><StatusBadge status={entry.type === "Created" ? "pending" : entry.type === "Status Update" ? "completed" : "in-progress"} label={entry.type} /></td><td className={cell}>{entry.details}</td><td className={cell}>{entry.by}</td><td className={cell}>{entry.remarks || "—"}</td></tr>
                ))}
                {!activity.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No activity yet.</td></tr>}
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={() => router.push("/property/maintenance")} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to List</Button>
            {open && (
              <Can permission={PERMISSIONS.propertyManage}>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setEditing(true)} leftIcon={<Pencil className="h-4 w-4" />}>{record.woNo ? "Edit" : "Create Work Order"}</Button>
                  <Button variant="outline" className="border-red-300 text-red-600" onClick={() => setCancelling(true)} leftIcon={<XCircle className="h-4 w-4" />}>Cancel WO</Button>
                  {record.woNo && <Button variant="success" onClick={() => setCompleting(true)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Mark as Completed</Button>}
                </div>
              </Can>
            )}
          </div>
        </div>
      </Card>
      <MaintenanceRequestModal open={editing} kind="work-order" record={record} onClose={() => setEditing(false)} onDone={() => setEditing(false)} />
      <CompleteWorkOrderModal open={completing} record={record} onClose={() => setCompleting(false)} onDone={() => setCompleting(false)} />
      <ConfirmDialog
        open={cancelling}
        title="Cancel this work order?"
        description={`${number} will be cancelled and the property returns to service.`}
        confirmLabel="Cancel work order"
        loading={saving}
        onConfirm={async () => {
          await save({ status: "cancelled" }, "Status Update", "Work order cancelled");
          setCancelling(false);
        }}
        onClose={() => setCancelling(false)}
      />
    </>
  );
}

function TasksTable({ tasks }: { tasks: Task[] }) {
  return (
    <FormBlock title="Work Order Tasks / Service Items" icon={ListChecks}>
      <table className="w-full text-[13px]">
        <thead><tr className={head}><th className={cell}>#</th><th className={cell}>Task / Activity</th><th className={cell}>Assigned To</th><th className={cn(cell, "text-right")}>Estimated Hours</th><th className={cn(cell, "text-right")}>Actual Hours</th><th className={cell}>Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {tasks.map((task, index) => (
            <tr key={index}><td className={cn(cell, "text-slate-500")}>{index + 1}</td><td className={cell}>{task.task}</td><td className={cell}>{task.assignedTo}</td><td className={cn(cell, "text-right")}>{formatNumber(task.estimatedHours)}</td><td className={cn(cell, "text-right")}>{formatNumber(task.actualHours)}</td><td className={cell}><StatusBadge status={task.status === "Completed" ? "completed" : task.status === "In Progress" ? "in-progress" : "pending"} label={task.status} /></td></tr>
          ))}
          {!tasks.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No tasks yet.</td></tr>}
        </tbody>
        {tasks.length > 0 && (
          <tfoot><tr className="bg-slate-50 font-bold"><td className={cell} colSpan={3}>Total</td><td className={cn(cell, "text-right")}>{formatNumber(tasks.reduce((sum, task) => sum + task.estimatedHours, 0))}</td><td className={cn(cell, "text-right")}>{formatNumber(tasks.reduce((sum, task) => sum + task.actualHours, 0))}</td><td /></tr></tfoot>
        )}
      </table>
    </FormBlock>
  );
}

function CostSummary({ labor, parts, other, total }: { labor: number; parts: number; other: number; total: number }) {
  return (
    <>
      <KeyValues labelWidth="w-44" rows={[["Labor", formatCurrency(labor)], ["Parts / Materials", formatCurrency(parts)], ["Other Charges", formatCurrency(other)]]} />
      <div className="mt-3 flex items-center justify-between rounded-lg border border-[#f8d3d3] bg-[#fdeeee] px-4 py-3"><span className="text-sm font-bold">Total Estimated Cost</span><span className="text-xl font-bold text-brand-600">{formatCurrency(total)}</span></div>
    </>
  );
}

export function WorkOrderDetailView({ id }: { id: string }) {
  const query = useGetMasterRecordQuery({ resource: "work-orders", id });
  useBreadcrumbLabel(id, query.data ? String(query.data.woNo ?? query.data.requestNo) : undefined);
  // Keep the list cache warm so going back is instant.
  useGetMasterRecordsQuery({ resource: "work-orders", params: { pageSize: 1000, sortBy: "requestDate", sortOrder: "desc" } });
  return <QueryBoundary {...query}>{(record) => <WorkOrder record={record} />}</QueryBoundary>;
}

