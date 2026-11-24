import Image from "next/image";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils/cn";

/** Brand mark. Replace /public/logo/logo.svg with the official logo to rebrand everywhere. */
export function Logo({ collapsed = false, light = false, className }: { collapsed?: boolean; light?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image src={appConfig.logoSrc} alt="SIMS logo" width={36} height={36} priority className="h-9 w-9 shrink-0" />
      {!collapsed && (
        <span className="leading-tight">
          <span className={cn("block text-lg font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>SIMS</span>
          <span className={cn("block whitespace-nowrap text-[11px] font-medium", light ? "text-slate-300" : "text-slate-600")}>Supply &amp; Inventory Management System</span>
        </span>
      )}
    </span>
  );
}
