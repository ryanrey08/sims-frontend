import { Badge } from "@/components/ui/Badge";
import { STATUS_META } from "@/constants/status";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">Not set</Badge>;
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
