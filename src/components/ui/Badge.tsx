import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "purple" | "orange";

/** Pill colours used across the SIMS mockups (soft background, darker text, rounded-md). */
const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-[#e3f5e9] text-[#1e8a46]",
  warning: "bg-[#fdf1d8] text-[#a66a00]",
  danger: "bg-[#fde4e4] text-[#c62828]",
  info: "bg-[#e3eefd] text-[#1d5fc4]",
  brand: "bg-brand-50 text-brand-700",
  purple: "bg-[#efe8fd] text-[#6d3fc4]",
  orange: "bg-[#fdeedd] text-[#c25a00]",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
