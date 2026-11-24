"use client";

import { useId } from "react";
import { Select, type SelectOption } from "@/components/ui/Select";

/** A labelled filter dropdown with an "All" option. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  allLabel?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className ?? "w-full sm:w-44"}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} options={options} placeholder={`${label}: ${allLabel}`} />
    </div>
  );
}
