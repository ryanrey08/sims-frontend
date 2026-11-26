"use client";

import { useId } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

/**
 * Labelled filter dropdown. `layout="inline"` renders "Status [All ▾]" (warehouse screens),
 * `layout="stacked"` renders the label above the select (transaction / inventory / property screens).
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  className,
  layout = "inline",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  allLabel?: string;
  className?: string;
  layout?: "inline" | "stacked";
}) {
  const id = useId();
  return (
    <div className={cn(layout === "inline" ? "flex items-center gap-2" : "flex flex-col gap-1", className)}>
      <label htmlFor={id} className={cn("whitespace-nowrap text-[13px] text-ink", layout === "stacked" && "font-medium")}>
        {label}
      </label>
      <div className={layout === "inline" ? "w-full sm:w-36" : "w-full sm:w-44"}>
        <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} options={options} placeholder={allLabel} className="h-9" />
      </div>
    </div>
  );
}
