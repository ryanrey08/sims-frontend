import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApprovalStep } from "@/types/records";

const ICONS = {
  approved: { icon: CheckCircle2, className: "text-emerald-600", label: "Approved" },
  pending: { icon: Clock, className: "text-amber-500", label: "Pending" },
  rejected: { icon: XCircle, className: "text-red-600", label: "Returned" },
  waiting: { icon: Circle, className: "text-slate-300", label: "Waiting" },
};

/** Vertical approval timeline, as shown on the SIMS approval screens. */
export function ApprovalWorkflow({ steps, compact = false }: { steps: ApprovalStep[]; compact?: boolean }) {
  return (
    <ol className={cn("relative", compact ? "space-y-3" : "space-y-4")} aria-label="Approval workflow">
      {steps.map((step, index) => {
        const meta = ICONS[step.status];
        const Icon = meta.icon;
        return (
          <li key={step.role} className="relative flex gap-3">
            {index < steps.length - 1 && <span className="absolute left-[11px] top-7 h-[calc(100%-12px)] w-px bg-line" aria-hidden />}
            <Icon className={cn("relative h-6 w-6 shrink-0 bg-white", meta.className)} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {index + 1}. {step.role}
                <span className="sr-only"> — {meta.label}</span>
              </p>
              <p className={cn("text-xs", step.status === "rejected" ? "text-red-600" : "text-muted")}>
                {step.status === "approved" || step.status === "rejected"
                  ? `${meta.label} by ${step.by ?? "—"} · ${formatDateTime(step.at)}`
                  : step.status === "pending"
                    ? "Awaiting approval"
                    : "Not yet reached"}
              </p>
              {step.remarks && <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">“{step.remarks}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
