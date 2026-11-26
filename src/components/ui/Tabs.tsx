"use client";

import { cn } from "@/lib/utils/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Accessible tab list in the two styles used by the mockups:
 * - "underline": icon + label, active tab red text with a red underline
 * - "pill": bordered buttons, active tab outlined in red
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label,
  variant = "underline",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label: string;
  variant?: "underline" | "pill";
}) {
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = event.key === "ArrowRight" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    onChange(items[next].value);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex overflow-x-auto", variant === "underline" ? "gap-1 border-b border-line" : "gap-2 py-1", className)}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const Icon = item.icon;
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
              "inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold transition-colors",
              variant === "underline"
                ? cn("-mb-px border-b-2 px-4 py-2.5", selected ? "border-brand-600 text-brand-600" : "border-transparent text-ink hover:text-brand-600")
                : cn("rounded-md border bg-white px-3.5 py-2", selected ? "border-brand-500 text-brand-600" : "border-line text-ink hover:bg-slate-50"),
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px]", selected ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-600")}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
