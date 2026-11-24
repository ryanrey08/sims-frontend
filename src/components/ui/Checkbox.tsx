import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...props },
  ref,
) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-900"
        {...props}
      />
      {(label || description) && (
        <span className="text-sm">
          {label && <span className="font-medium text-ink">{label}</span>}
          {description && <span className="block text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
});
