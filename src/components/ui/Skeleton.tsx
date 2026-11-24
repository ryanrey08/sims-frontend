import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-900" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
