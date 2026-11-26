import { LayoutGrid, List, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/** Search + filters row above a data table, with the mockup's list/grid toggle on the right. */
export function TableToolbar({
  children,
  onReset,
  showReset,
  actions,
  view,
  onViewChange,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
  actions?: React.ReactNode;
  view?: "list" | "grid";
  onViewChange?: (view: "list" | "grid") => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
        {showReset && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Reset
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {onViewChange && (
          <div className="flex gap-1" role="group" aria-label="View">
            {(["list", "grid"] as const).map((mode) => {
              const Icon = mode === "list" ? List : LayoutGrid;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  aria-label={mode === "list" ? "List view" : "Grid view"}
                  onClick={() => onViewChange(mode)}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                    view === mode ? "border-brand-200 bg-brand-50 text-brand-600" : "border-line bg-white text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
