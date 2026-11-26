/** Page title row from the mockups: red outline module icon, bold title, grey subtitle, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  aside,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Extra content rendered between the title and the actions (e.g. a stepper or a status chip). */
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="h-9 w-9 shrink-0 text-brand-600" strokeWidth={1.6} />}
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-0.5 text-[13px] text-slate-600">{description}</p>}
        </div>
      </div>
      {aside}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
