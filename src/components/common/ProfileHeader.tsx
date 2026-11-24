import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";

/** Summary banner at the top of detail pages. */
export function ProfileHeader({
  name,
  subtitle,
  badges,
  actions,
  meta,
  icon,
}: {
  name: string;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: { label: string; value: React.ReactNode }[];
  icon?: React.ReactNode;
}) {
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-brand-900 to-brand-700" aria-hidden />
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mt-8 flex items-end gap-4">
          <div className="rounded-full bg-white p-1 shadow-sm">
            {icon ?? <Avatar name={name} size="lg" />}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-ink">{name}</h1>
              {badges}
            </div>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && meta.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 sm:grid-cols-4">
          {meta.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
