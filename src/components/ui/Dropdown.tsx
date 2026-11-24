"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface DropdownProps {
  /** Renders the trigger; receives props that must be spread onto a <button>. */
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    "aria-controls": string;
  }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Accessible dropdown menu: closes on outside click and Escape, supports arrow-key navigation. */
export function Dropdown({ trigger, children, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    const first = containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {trigger({ onClick: () => setOpen((value) => !value), "aria-expanded": open, "aria-haspopup": "menu", "aria-controls": menuId })}
      {open && (
        <div
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-40 mt-2 min-w-48 rounded-xl border border-line bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none",
        danger ? "text-red-600 hover:bg-red-50 focus:bg-red-50" : "text-slate-700 hover:bg-slate-100 focus:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}
