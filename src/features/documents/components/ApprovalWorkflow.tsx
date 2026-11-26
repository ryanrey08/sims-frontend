import { Check, Clock, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApprovalStep } from "@/types/records";

/**
 * Vertical approval list from the approval screens (p11–p13, p18): approved steps with a
 * green check, the current step highlighted pink with a red number, the rest grey.
 */
export function ApprovalWorkflow({ steps, compact = false, currentNote }: { steps: ApprovalStep[]; compact?: boolean; currentNote?: string }) {
  return (
    <ol className={cn("space-y-2", compact && "space-y-1.5")} aria-label="Approval workflow">
      {steps.map((step, index) => {
        const current = step.status === "pending";
        return (
          <li
            key={step.role}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5",
              step.status === "approved" && "border-[#cdeedb] bg-[#f1faf4]",
              current && "border-[#f8d3d3] bg-[#fdeeee]",
              step.status === "rejected" && "border-red-200 bg-red-50",
              step.status === "waiting" && "border-line bg-white",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step.status === "approved" && "bg-[#1f9d55] text-white",
                current && "bg-brand-600 text-white",
                step.status === "rejected" && "bg-red-600 text-white",
                step.status === "waiting" && "bg-slate-200 text-slate-600",
              )}
              aria-hidden
            >
              {step.status === "approved" ? <Check className="h-4 w-4" strokeWidth={3} /> : step.status === "rejected" ? <X className="h-4 w-4" strokeWidth={3} /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink">{step.role} Approval</p>
              <p className={cn("text-xs", step.status === "rejected" ? "text-red-600" : "text-slate-600")}>
                {step.status === "approved" && <>Approved by: {step.by ?? "—"}</>}
                {step.status === "rejected" && <>Returned by: {step.by ?? "—"}</>}
                {current && (currentNote ?? "For Approval")}
                {step.status === "waiting" && "Pending"}
              </p>
              {step.remarks && <p className="mt-1 text-xs italic text-slate-600">“{step.remarks}”</p>}
            </div>
            {(step.status === "approved" || step.status === "rejected") && step.at && <span className="shrink-0 text-right text-[11px] text-slate-500">{formatDateTime(step.at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Horizontal stepper used on the "New …" forms (p10): the requestor first (done), then each
 * approver with "For Approval" under the role.
 */
export function HorizontalWorkflow({ requestor, roles }: { requestor: string; roles: string[] }) {
  const steps = [{ role: "Requestor", note: requestor, done: true }, ...roles.map((role, index) => ({ role, note: index === roles.length - 1 && roles.length > 2 ? "For Notation" : "For Approval", done: false }))];
  return (
    <ol className="flex items-start" aria-label="Approval workflow">
      {steps.map((step, index) => (
        <li key={step.role} className="relative flex flex-1 flex-col items-center text-center">
          {index > 0 && <span className="absolute right-1/2 top-4 h-px w-full bg-slate-300" aria-hidden />}
          <span
            className={cn(
              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
              step.done ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-400",
            )}
          >
            {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clock className="h-3.5 w-3.5" />}
          </span>
          <span className="mt-2 text-[12px] font-bold text-ink">{step.role}</span>
          <span className="text-[11px] text-slate-500">{step.note}</span>
        </li>
      ))}
    </ol>
  );
}
