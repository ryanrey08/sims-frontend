"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

/** Green toggle switch with a text label, as used for "Status: Active" in the mockup forms. */
export const Switch = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: React.ReactNode }>(
  function Switch({ label, className, id, ...props }, ref) {
    return (
      <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink", className)}>
        <span className="relative inline-flex">
          <input ref={ref} id={id} type="checkbox" role="switch" className="peer sr-only" {...props} />
          <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#22a35a] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500" />
          <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
        {label}
      </label>
    );
  },
);
