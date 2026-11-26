"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, FileText, Info, Landmark, Send, UserCog, Wrench } from "lucide-react";
import { FormBlock, HField } from "@/components/forms/HField";
import { ModalIcon } from "@/components/common/SuccessDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime, todayISO } from "@/lib/utils/format";
import { useGetMasterRecordsQuery, useSaveMasterRecordMutation } from "@/services/api/endpoints/mastersApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import type { DocumentAttachment, FieldValue, MasterRecord } from "@/types/records";
import { Attachments } from "@/features/documents/components/Attachments";
import { KeyValues } from "./shared";

export interface Task { task: string; assignedTo: string; estimatedHours: number; actualHours: number; startDate?: string; targetDate?: string; status: string }
export interface Part { itemCode: string; description: string; unit: string; quantity: number; unitCost: number; source: string; status: string }
export interface Activity { at: string; type: string; details: string; by: string; remarks: string }

export const parseJson = <T,>(value: unknown, fallback: T): T => {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const PRIORITY_TONE: Record<string, BadgeTone> = { High: "danger", Medium: "warning", Low: "success" };
export const PriorityPill = ({ value }: { value: unknown }) => <Badge tone={PRIORITY_TONE[String(value)] ?? "neutral"}>{String(value ?? "—")}</Badge>;

export const isOverdue = (record: MasterRecord) => record.status !== "completed" && record.status !== "cancelled" && Boolean(record.targetDate) && String(record.targetDate) < todayISO();
export const woStatus = (record: MasterRecord) => (isOverdue(record) ? "overdue" : String(record.status));

/** Body for a save: the record without derived labels and bookkeeping fields. */
export function recordBody(record: MasterRecord, changes: Record<string, FieldValue> = {}) {
  const body: Record<string, FieldValue> = {};
  Object.entries(record).forEach(([key, value]) => {
    if (key.endsWith("__label") || key === "id" || key === "createdAt" || key === "updatedAt" || value === undefined) return;
    body[key] = value;
  });
  return { ...body, ...changes };
}

/** Saves a work order change, logs it in the activity trail and keeps the property's status in step. */
export function useWorkOrderActions() {
  const [save, state] = useSaveMasterRecordMutation();
  const user = useAppSelector(selectCurrentUser);
  const { data: properties } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });

  const syncProperty = async (propertyId: unknown, status: "for-maintenance" | "back") => {
    const property = properties?.data.find((item) => item.id === propertyId);
    if (!property) return;
    const next = status === "for-maintenance" ? "for-maintenance" : property.accountableId ? "assigned" : "available";
    if (property.status === next || ["disposed", "lost", "for-disposal"].includes(String(property.status))) return;
    await save({ resource: "properties", id: property.id, body: recordBody(property, { status: next, condition: status === "for-maintenance" ? "For Repair" : "Serviceable" }) }).unwrap();
  };

  const update = async (record: MasterRecord | undefined, changes: Record<string, FieldValue>, activity: { type: string; details: string; remarks?: string }) => {
    const log = [...parseJson<Activity[]>(record?.activity, []), { at: new Date().toISOString(), type: activity.type, details: activity.details, by: user?.name ?? "System", remarks: activity.remarks ?? "" }];
    const body = record ? recordBody(record, { ...changes, activity: JSON.stringify(log) }) : { ...changes, activity: JSON.stringify(log) };
    const saved = await save({ resource: "work-orders", id: record?.id, body }).unwrap();
    if (!record) await syncProperty(saved.propertyId, "for-maintenance");
    if (changes.status === "completed" || changes.status === "cancelled") await syncProperty(saved.propertyId, "back");
    return saved;
  };

  return { update, saving: state.isLoading, user };
}

const opts = (values: string[]) => values.map((value) => ({ label: value, value }));

/**
 * "New Maintenance Request" (p68) with the review and result steps of p69–p70, and
 * "New Work Order" (p72) when `kind` is "work-order".
 */
export function MaintenanceRequestModal({
  open,
  kind,
  propertyId,
  record,
  onClose,
  onDone,
}: {
  open: boolean;
  kind: "request" | "work-order";
  propertyId?: string;
  record?: MasterRecord;
  onClose: () => void;
  onDone: (record: MasterRecord) => void;
}) {
  const formId = useId();
  const toast = useToast();
  const { update, saving, user } = useWorkOrderActions();
  const { data: properties } = useGetMasterRecordsQuery({ resource: "properties", params: { pageSize: 1000 } });
  const { data: existing } = useGetMasterRecordsQuery({ resource: "work-orders", params: { pageSize: 1000 } });
  const [step, setStep] = useState<"form" | "review" | "result">("form");
  const [files, setFiles] = useState<DocumentAttachment[]>([]);
  const [saved, setSaved] = useState<MasterRecord | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const workOrder = kind === "work-order";

  const nextNo = (field: "requestNo" | "woNo", prefix: string, pad: number) => {
    const numbers = (existing?.data ?? []).map((item) => Number(String(item[field] ?? "").split("-").pop()) || 0);
    return `${prefix}-${new Date().getFullYear()}-${String(Math.max(0, ...numbers) + 1).padStart(pad, "0")}`;
  };

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setFiles([]);
    setSaved(null);
    setErrors({});
    // Defaults from the Maintenance Settings tab.
    let defaults = { routeTo: "ICT Head", targetDays: "7" };
    try {
      defaults = { ...defaults, ...JSON.parse(window.localStorage.getItem("sims.maintenance.settings") ?? "{}") };
    } catch {
      // Built-in defaults apply.
    }
    setValues({
      requestDate: String(record?.requestDate ?? todayISO()),
      propertyId: String(record?.propertyId ?? propertyId ?? ""),
      type: String(record?.type ?? "Corrective"),
      priority: String(record?.priority ?? "Medium"),
      targetDate: String(record?.targetDate ?? new Date(Date.now() + (Number(defaults.targetDays) || 7) * 86400000).toISOString().slice(0, 10)),
      issue: String(record?.issue ?? ""),
      details: String(record?.details ?? ""),
      requestedBy: String(record?.requestedBy ?? user?.name ?? ""),
      department: String(record?.department ?? ""),
      routeTo: String(record?.routeTo ?? defaults.routeTo),
      assignedTo: String(record?.assignedTo ?? ""),
      technician: String(record?.technician ?? ""),
      startDate: String(record?.startDate ?? todayISO()),
      workRequired: "",
    });
  }, [open, record, propertyId, user]);

  const property = properties?.data.find((item) => item.id === values.propertyId);
  const set = (name: string) => ({
    id: `mr-${name}`,
    value: values[name] ?? "",
    "aria-invalid": errors[name] ? true : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  const validate = () => {
    const required = workOrder ? ["requestDate", "propertyId", "type", "priority", "issue", "requestedBy", "department", "assignedTo", "startDate", "targetDate"] : ["requestDate", "propertyId", "type", "priority", "issue", "requestedBy", "department", "routeTo"];
    const next: Record<string, string> = {};
    required.forEach((name) => {
      if (!values[name]?.trim()) next[name] = "This field is required.";
    });
    if (values.targetDate && values.startDate && workOrder && values.targetDate < values.startDate) next.targetDate = "Target date must be on or after the start date.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (draft = false) => {
    if (!validate()) return;
    try {
      const changes: Record<string, FieldValue> = {
        requestNo: String(record?.requestNo ?? nextNo("requestNo", "MR", 6)),
        woNo: workOrder ? String(record?.woNo ?? nextNo("woNo", "WO", 4)) : (record?.woNo as string | null) ?? null,
        requestDate: values.requestDate,
        propertyId: values.propertyId,
        type: values.type,
        priority: values.priority,
        issue: values.issue,
        details: [values.details, values.workRequired && `Work required: ${values.workRequired}`].filter(Boolean).join("\n") || null,
        requestedBy: values.requestedBy,
        department: values.department,
        routeTo: values.routeTo || null,
        assignedTo: values.assignedTo || null,
        technician: values.technician || null,
        startDate: workOrder ? values.startDate : null,
        targetDate: values.targetDate || null,
        attachments: JSON.stringify([...parseJson<DocumentAttachment[]>(record?.attachments, []), ...files]),
        tasks: (record?.tasks as string) ?? "[]",
        parts: (record?.parts as string) ?? "[]",
        status: draft ? "pending" : workOrder ? (values.startDate <= todayISO() ? "in-progress" : "scheduled") : "pending",
      };
      const result = await update(record, changes, {
        type: record ? "Status Update" : "Created",
        details: workOrder ? `Work order ${changes.woNo} ${record ? "updated" : "created"} and assigned to ${values.assignedTo}` : `Maintenance request ${changes.requestNo} submitted to ${values.routeTo}`,
        remarks: files.length ? `${files.length} attachment(s)` : "",
      });
      if (draft || workOrder) {
        toast.success(draft ? "Draft saved" : record ? "Work order updated" : "Work order created", String(result.woNo ?? result.requestNo));
        onDone(result);
        return;
      }
      setSaved(result);
      setStep("result");
    } catch (error) {
      toast.error("Could not save", error);
    }
  };

  const title = workOrder ? (record ? `Edit Work Order – ${String(record.woNo ?? record.requestNo)}` : "New Work Order") : step === "form" ? "New Maintenance Request" : "Submit Maintenance Request";
  const field = (name: string, label: string, control: React.ReactNode, required = false) => (
    <HField label={label} htmlFor={`mr-${name}`} required={required} error={errors[name]} labelWidth="w-36">
      {control}
    </HField>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      variant="brand"
      icon={<Wrench className="h-5 w-5" />}
      title={title}
      footer={
        step === "form" ? (
          <>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={saving}>Save as Draft</Button>
            {workOrder ? (
              <Button loading={saving} onClick={() => submit()}>{record ? "Save Work Order" : "Create Work Order"}</Button>
            ) : (
              <Button onClick={() => validate() && setStep("review")} leftIcon={<Send className="h-4 w-4" />}>Submit Request</Button>
            )}
          </>
        ) : step === "review" ? (
          <>
            <Button variant="outline" className="mr-auto" onClick={() => setStep("form")}>Back to Edit</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={saving} onClick={() => submit()} leftIcon={<Send className="h-4 w-4" />}>Submit Request</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => saved && onDone(saved)}>View Request</Button>
            <Button variant="outline" onClick={() => { setStep("form"); setValues((current) => ({ ...current, issue: "", details: "" })); }}>Create Another Request</Button>
            <Button onClick={onClose}>Back to Maintenance</Button>
          </>
        )
      }
    >
      {!workOrder && (
        <ol className="mb-4 flex items-center gap-2 text-[13px]" aria-label="Steps">
          {["Request Details", "Review & Confirm", "Submission Result"].map((label, index) => {
            const current = ["form", "review", "result"].indexOf(step);
            return (
              <li key={label} className="flex items-center gap-2">
                {index > 0 && <span className="h-px w-8 bg-slate-300" aria-hidden />}
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", index < current ? "bg-[#1f9d55] text-white" : index === current ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-500")}>{index < current ? "✓" : index + 1}</span>
                <span className={cn("font-semibold", index === current ? "text-brand-600" : "text-slate-600")}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}
      {step === "form" && (
        <form id={formId} className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (workOrder) void submit(); else if (validate()) setStep("review"); }} noValidate>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormBlock title={workOrder ? "Work Order Information" : "Request Information"} icon={FileText}>
              <div className="space-y-3">
                {field("no", workOrder ? "Work Order No." : "Request No.", <Input id="mr-no" readOnly className="bg-slate-100" value={workOrder ? String(record?.woNo ?? "Auto-generated") : String(record?.requestNo ?? "Auto-generated")} />)}
                {field("requestDate", workOrder ? "WO Date" : "Request Date", <Input type="date" {...set("requestDate")} />, true)}
                {field("type", workOrder ? "Work Order Type" : "Request Type", <Select options={opts(["Corrective", "Preventive", "Scheduled", "Emergency"])} {...set("type")} />, true)}
                {field("priority", "Priority", <Select options={opts(["High", "Medium", "Low"])} {...set("priority")} />, true)}
                {field("targetDate", "Target Completion", <Input type="date" {...set("targetDate")} />, workOrder)}
              </div>
            </FormBlock>
            <FormBlock title="Property Details" icon={Landmark}>
              <div className="space-y-3">
                {field("propertyId", "Property No.", <Select key={properties?.data.length ?? 0} placeholder="Select property" options={(properties?.data ?? []).filter((item) => !["disposed", "lost"].includes(String(item.status))).map((item) => ({ label: `${String(item.propertyNo)} – ${String(item.description)}`, value: item.id }))} {...set("propertyId")} />, true)}
                <KeyValues rows={[["Description", String(property?.description ?? "—")], ["Category", String(property?.category ?? "—")], ["Location", String(property?.locationId__label ?? "—")], ["Custodian", String(property?.accountableId__label ?? "—")]]} />
              </div>
            </FormBlock>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormBlock title={workOrder ? "Work Order Details" : "Maintenance Details"} icon={Wrench}>
              <div className="space-y-3">
                {field("issue", "Issue / Problem", <Input {...set("issue")} />, true)}
                {field("details", "Detailed Description", <Textarea rows={2} {...set("details")} />)}
                {workOrder && field("workRequired", "Work Required", <Textarea rows={2} {...set("workRequired")} />)}
                {field("requestedBy", "Requested By", <Input {...set("requestedBy")} />, true)}
                {field("department", "Department", <Input {...set("department")} />, true)}
              </div>
            </FormBlock>
            <FormBlock title="Attachment(s)" icon={FileText}>
              <Attachments value={files} onChange={setFiles} />
            </FormBlock>
          </div>
          {workOrder ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <FormBlock title="Assignment" icon={UserCog}>
                <div className="space-y-3">
                  {field("assignedTo", "Assigned To", <Select placeholder="Select team" options={opts(["IT Support Team", "Facilities Team", "Motor Pool", "External Service Provider"])} {...set("assignedTo")} />, true)}
                  {field("technician", "Technician", <Input {...set("technician")} />)}
                </div>
              </FormBlock>
              <FormBlock title="Schedule" icon={ClipboardCheck}>
                <div className="space-y-3">{field("startDate", "Start Date", <Input type="date" {...set("startDate")} />, true)}</div>
              </FormBlock>
            </div>
          ) : (
            <FormBlock title="Approval / Routing" icon={Send}>
              <div className="grid gap-3 lg:grid-cols-2">{field("routeTo", "Route To", <Select options={opts(["ICT Head", "Facilities Head", "Motor Pool Supervisor", "Property Custodian"])} {...set("routeTo")} />, true)}</div>
            </FormBlock>
          )}
        </form>
      )}
      {step === "review" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormBlock title="Request Information" icon={FileText}><KeyValues rows={[["Request Date", formatDate(values.requestDate)], ["Request Type", values.type], ["Priority", <PriorityPill key="p" value={values.priority} />], ["Target Completion", formatDate(values.targetDate)]]} /></FormBlock>
            <FormBlock title="Property Details" icon={Landmark}><KeyValues rows={[["Property No.", String(property?.propertyNo ?? "—")], ["Description", String(property?.description ?? "—")], ["Location", String(property?.locationId__label ?? "—")], ["Custodian", String(property?.accountableId__label ?? "—")]]} /></FormBlock>
            <FormBlock title="Maintenance Details" icon={Wrench}><KeyValues rows={[["Issue / Problem", values.issue], ["Description", values.details || "—"], ["Requested By", values.requestedBy], ["Department", values.department], ["Route To", values.routeTo]]} /></FormBlock>
            <FormBlock title={`Attachments (${files.length})`} icon={FileText}><Attachments value={files} readOnly /></FormBlock>
          </div>
          <p className="flex items-start gap-2 rounded-lg border border-[#cfe0fb] bg-[#eaf2fe] px-4 py-3 text-[13px] text-[#1d4fa3]"><Info className="mt-0.5 h-4 w-4 shrink-0" />Please confirm submission. The request will be routed to the {values.routeTo} for approval.</p>
        </div>
      )}
      {step === "result" && saved && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border border-[#cdeedb] bg-[#e8f7ee] px-4 py-4">
            <ModalIcon><CheckCircle2 className="h-5 w-5" /></ModalIcon>
            <div>
              <p className="text-base font-bold text-[#1a7f46]">Maintenance Request Submitted Successfully!</p>
              <p className="text-[13px] text-slate-700">Request No. <b className="text-brand-600">{String(saved.requestNo)}</b> · Submitted on {formatDateTime(String(saved.createdAt))} · <StatusBadge status="pending" /> · <PriorityPill value={saved.priority} /></p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormBlock title="Request Summary" icon={FileText}><KeyValues rows={[["Property", `${String(property?.propertyNo ?? "")} – ${String(property?.description ?? "")}`], ["Issue / Problem", String(saved.issue)], ["Requested By", String(saved.requestedBy)], ["Route To", String(saved.routeTo ?? "—")]]} /></FormBlock>
            <FormBlock title="Next Steps" icon={ClipboardCheck}>
              <ol className="space-y-2 text-[13px]">
                {["Request Submitted", "For Approval", "For Assignment", "In Progress", "Completed"].map((label, index) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", index === 0 ? "bg-[#1f9d55] text-white" : "border border-slate-300 text-slate-500")}>{index === 0 ? "✓" : index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
            </FormBlock>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** "Mark Work Order as Completed" confirmation (p78). */
export function CompleteWorkOrderModal({ open, record, onClose, onDone }: { open: boolean; record?: MasterRecord; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { update, saving } = useWorkOrderActions();
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const propertyLabel = useMemo(() => String(record?.propertyId__label ?? "—"), [record]);

  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setRemarks("");
      setError("");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={<ModalIcon><CheckCircle2 className="h-5 w-5" /></ModalIcon>}
      title="Mark Work Order as Completed"
      description="Confirm that all work has been finished and the property can return to service."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="success"
            loading={saving}
            onClick={async () => {
              if (!record) return;
              if (!remarks.trim()) return setError("Enter the completion remarks.");
              try {
                const tasks = parseJson<Task[]>(record.tasks, []).map((task) => ({ ...task, status: "Completed" }));
                await update(record, { status: "completed", completedDate: date, completionRemarks: remarks.trim(), tasks: JSON.stringify(tasks) }, { type: "Status Update", details: "Work order marked as completed", remarks: remarks.trim() });
                toast.success("Work order completed", String(record.woNo ?? record.requestNo));
                onDone();
              } catch (saveError) {
                toast.error("Could not complete the work order", saveError);
              }
            }}
          >
            Mark as Completed
          </Button>
        </>
      }
    >
      {record && (
        <div className="space-y-3">
          <KeyValues rows={[["Work Order No.", String(record.woNo ?? record.requestNo)], ["Property", propertyLabel], ["Issue", String(record.issue)]]} />
          <label className="block text-[13px] font-semibold">Completed Date <span className="text-red-600">*</span><Input type="date" className="mt-1" value={date} max={todayISO()} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="block text-[13px] font-semibold">
            Completion Remarks <span className="text-red-600">*</span>
            <Textarea className="mt-1" rows={3} maxLength={500} value={remarks} aria-invalid={error ? true : undefined} onChange={(event) => { setRemarks(event.target.value); setError(""); }} />
          </label>
          <div className="flex justify-between text-xs"><span role="alert" className="text-red-600">{error}</span><span className="text-slate-500">{remarks.length} / 500</span></div>
        </div>
      )}
    </Modal>
  );
}
