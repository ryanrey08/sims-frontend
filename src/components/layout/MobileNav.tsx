"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { SidebarNav } from "./Sidebar";

/** Off-canvas navigation drawer for phones and tablets. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
    // Close whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-900 shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Logo light />
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-brand-100 hover:bg-white/10" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  );
}
