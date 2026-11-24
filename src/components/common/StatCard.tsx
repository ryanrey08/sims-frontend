import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

/** Pastel tinted cards with a matching outlined icon, as in the SIMS mockups. */
const accents = {
  brand: { card: "border-sky-100 bg-sky-50/70", icon: "text-sky-700" },
  amber: { card: "border-amber-100 bg-amber-50/80", icon: "text-amber-600" },
  emerald: { card: "border-emerald-100 bg-emerald-50/70", icon: "text-emerald-700" },
  sky: { card: "border-violet-100 bg-violet-50/70", icon: "text-violet-700" },
  rose: { card: "border-rose-100 bg-rose-50/70", icon: "text-rose-600" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: keyof typeof accents;
  loading?: boolean;
}) {
  return (
    <Card className={cn("flex items-center gap-4 p-5 shadow-none", accents[accent].card)}>
      <div className={cn("shrink-0", accents[accent].icon)}>
        <Icon className="h-9 w-9" strokeWidth={1.6} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {loading ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 text-2xl font-bold text-ink">{value}</p>}
        {hint && !loading && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
