"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Boxes, LineChart, ShieldCheck, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { firstAllowedPath } from "@/config/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { usePermissions } from "@/hooks/usePermission";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuthStatus } from "@/store/features/authSlice";

const highlights = [
  { icon: Boxes, text: "Real-time stock levels across every warehouse and storeroom" },
  { icon: ShoppingCart, text: "Purchase orders, deliveries and supplier records in one place" },
  { icon: LineChart, text: "Low-stock alerts, valuation and movement reports" },
  { icon: ShieldCheck, text: "Role-based access for managers, purchasing, warehouse and requesters" },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const status = useAppSelector(selectAuthStatus);
  const router = useRouter();
  const { can } = usePermissions();
  const hydrated = useHydrated();

  useEffect(() => {
    if (status === "authenticated") {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : firstAllowedPath(can));
    }
  }, [status, router, can]);

  if (!hydrated || status === "unknown" || status === "authenticated") return <FullPageLoader />;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-[3rem] rotate-45 bg-brand-600/80" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-[3rem] rotate-45 bg-brand-700/40" aria-hidden />
        <span className="relative inline-flex w-fit rounded-xl bg-white px-4 py-2.5"><Logo /></span>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Every item, every warehouse, always accounted for.</h1>
          <p className="mt-4 text-slate-300">
            SIMS brings purchasing, receiving, stock control and supply requests together for your whole organization.
          </p>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="rounded-lg bg-white/10 p-2">
                  <item.icon className="h-4 w-4 text-brand-400" />
                </span>
                <span className="pt-1.5">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} SIMS · Supply & Inventory Management System</p>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </section>
    </div>
  );
}
