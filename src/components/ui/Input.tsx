import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClasses =
  "w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition-colors " +
  "hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/20";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldClasses, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(fieldClasses, "py-2", className)} {...props} />;
  },
);
