import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

const accents = {
  brand: "bg-brand-50 text-brand-900",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700",
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
  icon: React.ComponentType<{ className?: string }>;
  accent?: keyof typeof accents;
  loading?: boolean;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <div className={cn("rounded-xl p-3", accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        {loading ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 text-2xl font-bold text-ink">{value}</p>}
        {hint && !loading && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
