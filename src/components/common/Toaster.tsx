"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { selectToasts, toastDismissed, type Toast } from "@/store/features/uiSlice";

const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const tones = {
  success: "text-emerald-600",
  error: "text-red-600",
  info: "text-brand-700",
  warning: "text-amber-600",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const Icon = icons[toast.tone];
  useEffect(() => {
    const timer = setTimeout(() => dispatch(toastDismissed(toast.id)), toast.tone === "error" ? 7000 : 4500);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.tone]);
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-lg"
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tones[toast.tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dispatch(toastDismissed(toast.id))}
        className="rounded p-0.5 text-slate-400 hover:text-slate-600"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector(selectToasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-96">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
