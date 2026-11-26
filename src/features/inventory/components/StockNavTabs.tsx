"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ClipboardCheck, FileInput, FileOutput, LayoutGrid, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Bordered pill tabs under the Stock Management cards (p14); each tab opens its module. */
export const STOCK_TABS = [
  { href: "/inventory", label: "Stock Overview", icon: LayoutGrid },
  { href: "/documents/receiving", label: "Receiving (GRN)", icon: FileInput },
  { href: "/documents/issuances", label: "Issuance (RIS/ICS/PAR)", icon: FileOutput },
  { href: "/documents/stock-transfers", label: "Transfer", icon: ArrowLeftRight },
  { href: "/documents/stock-adjustments", label: "Adjustments", icon: SlidersHorizontal },
  { href: "/documents/physical-counts", label: "Physical Count", icon: ClipboardCheck },
  { href: "/inventory/reorder", label: "Reorder", icon: RefreshCw },
];

export function StockNavTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Stock management sections" className="flex flex-wrap gap-2">
      {STOCK_TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold transition-colors",
              active ? "border-brand-600 bg-white text-brand-600" : "border-line bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
