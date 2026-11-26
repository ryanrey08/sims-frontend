import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

/** Tinted summary cards from the mockups: soft background + border, large outline icon in the matching colour. */
const accents = {
  blue: { card: "border-[#cfe0fb] bg-[#eaf2fe]", icon: "text-[#2f6fd6]" },
  green: { card: "border-[#cdeedb] bg-[#e8f7ee]", icon: "text-[#21a05a]" },
  yellow: { card: "border-[#f8e3b5] bg-[#fdf5e3]", icon: "text-[#e09a12]" },
  pink: { card: "border-[#f8d3d3] bg-[#fdeeee]", icon: "text-[#e04848]" },
  purple: { card: "border-[#e1d6fa] bg-[#f3eefe]", icon: "text-[#7a4fd8]" },
  sky: { card: "border-[#cdeaf6] bg-[#e9f7fc]", icon: "text-[#1b93c4]" },
};

export type StatAccent = keyof typeof accents;

/** Legacy accent names used by older screens map onto the mockup palette. */
const ALIASES: Record<string, StatAccent> = { brand: "blue", emerald: "green", amber: "yellow", rose: "pink" };

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "blue",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: StatAccent | "brand" | "emerald" | "amber" | "rose";
  loading?: boolean;
}) {
  const tint = accents[(ALIASES[accent] ?? accent) as StatAccent];
  return (
    <Card className={cn("flex min-h-[88px] items-center gap-4 px-5 py-4 shadow-none", tint.card)}>
      <Icon className={cn("h-10 w-10 shrink-0", tint.icon)} strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {loading ? <Skeleton className="mt-1.5 h-7 w-20" /> : <p className="mt-0.5 truncate text-2xl font-bold leading-tight text-ink">{value}</p>}
        {hint && !loading && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

/** Responsive row of summary cards (4, 5 or 6 per row on wide screens). */
export function StatGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: 3 | 4 | 5 | 6 }) {
  const cols = { 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6" }[columns];
  return <div className={cn("mb-5 grid gap-4 sm:grid-cols-2", cols)}>{children}</div>;
}
