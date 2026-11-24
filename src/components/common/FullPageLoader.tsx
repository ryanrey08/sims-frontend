import { Spinner } from "@/components/ui/Skeleton";

export function FullPageLoader({ label = "Loading SIMS" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <Spinner label={label} />
        {label}…
      </div>
    </div>
  );
}
