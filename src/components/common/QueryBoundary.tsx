import { ErrorState } from "./States";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/** Renders loading / error / data states for a single-record query. */
export function QueryBoundary<T>({
  data,
  isLoading,
  error,
  refetch,
  children,
}: {
  data?: T;
  isLoading: boolean;
  error?: unknown;
  refetch?: () => void;
  children: (data: T) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Card className="space-y-3 p-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </Card>
      </div>
    );
  }
  if (error || data === undefined) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }
  return <>{children(data)}</>;
}
