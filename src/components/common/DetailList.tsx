import { cn } from "@/lib/utils/cn";

export interface DetailItem {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}

/** Read-only label/value grid for detail pages. */
export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 2 | 3 }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className={cn(item.wide && "sm:col-span-full")}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-ink">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
