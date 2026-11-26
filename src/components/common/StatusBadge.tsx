import { Badge } from "@/components/ui/Badge";
import { STATUS_META } from "@/constants/status";

/** Status pill as drawn in the mockups: soft colour, rounded-md, no dot. */
export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  if (!status) return <Badge tone="neutral">Not set</Badge>;
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{label ?? meta.label}</Badge>;
}
