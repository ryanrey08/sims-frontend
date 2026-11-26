"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * "brand": red header bar with white title (create / edit forms in the mockups).
   * "default": white header (confirmations); pass an `icon` such as a green check.
   */
  variant?: "default" | "brand";
  icon?: React.ReactNode;
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it and focus returns to the trigger automatically.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md", variant = "default", icon }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };
  const brand = variant === "brand";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn("m-auto w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-900/50", widths[size])}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className={cn("flex items-start justify-between gap-4 px-5 py-3.5", brand ? "bg-brand-600 text-white" : "border-b border-line")}>
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h2 id={titleId} className={cn("font-bold", brand ? "text-lg" : "text-lg text-ink")}>
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className={cn("mt-0.5 text-[13px]", brand ? "text-white/85" : "text-slate-600")}>
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn("rounded-md p-1", brand ? "text-white hover:bg-white/15" : "text-slate-500 hover:bg-slate-100")}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
