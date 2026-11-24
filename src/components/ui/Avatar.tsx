import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const palette = ["bg-brand-100 text-brand-900", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-sky-100 text-sky-800", "bg-rose-100 text-rose-800"];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const tone = palette[name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", tone, sizes[size], className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
