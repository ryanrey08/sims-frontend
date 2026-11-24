import { AlertCircle, Inbox, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-700">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "We couldn't load this data",
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 rounded-full bg-red-50 p-3 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} leftIcon={<RotateCw className="h-4 w-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
