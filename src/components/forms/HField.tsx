import { cn } from "@/lib/utils/cn";

/**
 * Horizontal form field (label on the left, control on the right) used throughout
 * the mockup forms and modals. Pass the same `htmlFor` as the control's id.
 */
export function HField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  labelWidth = "w-36",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  labelWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3", className)}>
      <label htmlFor={htmlFor} className={cn("shrink-0 pt-2 text-[13px] font-medium text-ink", labelWidth)}>
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="min-w-0 flex-1">
        {children}
        {error ? (
          <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : (
          hint && <p className="mt-1 text-xs text-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}

/** Card-like section with a small red icon + bold heading, used inside forms and modals. */
export function FormBlock({
  title,
  icon: Icon,
  actions,
  className,
  tone = "white",
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  className?: string;
  tone?: "white" | "gray";
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-line p-4", tone === "gray" ? "bg-slate-50" : "bg-white", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          {Icon && <Icon className="h-4 w-4 text-brand-600" />}
          {title}
        </h3>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
