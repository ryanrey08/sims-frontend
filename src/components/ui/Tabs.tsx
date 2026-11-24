"use client";

import { cn } from "@/lib/utils/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Accessible tab list. Content is rendered by the parent based on `value`. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label: string;
}) {
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = event.key === "ArrowRight" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    onChange(items[next].value);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              selected ? "border-brand-900 text-brand-900" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
