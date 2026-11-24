import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Search + filters row above a data table. */
export function TableToolbar({
  children,
  onReset,
  showReset,
  actions,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
        {showReset && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Reset
          </Button>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
