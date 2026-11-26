"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useLazyGlobalSearchQuery } from "@/services/api/endpoints/dashboardApi";
import { Spinner } from "@/components/ui/Skeleton";

/** Header search across products, suppliers and purchase orders (lazy RTK Query). */
/** Placeholder text per module, as shown in the mockups. */
function searchPlaceholder(pathname: string) {
  if (pathname.startsWith("/documents/receiving") || pathname.startsWith("/documents/issuances")) return "Search in SIMS (e.g., Item, PO, PR, transaction no.)";
  if (pathname.startsWith("/products") || pathname.startsWith("/inventory/inquiry") || pathname.startsWith("/inventory/reorder") || pathname.startsWith("/inventory/labels")) return "Search in SIMS (e.g., Item code, description, PO, RIS/CS/PAR)";
  if (pathname.startsWith("/masters/properties") || pathname.startsWith("/property")) return "Search in SIMS (e.g., property no., description, serial no., location)";
  return "Search in SIMS (e.g., item, PO, warehouse)";
}

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term.trim(), 300);
  const [trigger, { data, isFetching }] = useLazyGlobalSearchQuery();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length >= 2) trigger(debounced, true);
  }, [debounced, trigger]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const groups = [
    { key: "products", label: "Products", base: "/products", allowed: can(PERMISSIONS.productsView), items: data?.products ?? [] },
    { key: "suppliers", label: "Suppliers", base: "/suppliers", allowed: can(PERMISSIONS.suppliersView), items: data?.suppliers ?? [] },
    { key: "purchaseOrders", label: "Purchase orders", base: "/purchase-orders", allowed: can(PERMISSIONS.purchasingView), items: data?.purchaseOrders ?? [] },
  ].filter((group) => group.allowed && group.items.length);

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative hidden w-72 md:block xl:w-80">
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && debounced.length >= 2}
        aria-controls="global-search-results"
        aria-label="Search products, suppliers and purchase orders"
        placeholder={searchPlaceholder(pathname)}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-3 pr-9 text-[13px] placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {open && debounced.length >= 2 && (
        <div id="global-search-results" className="absolute z-40 mt-2 w-full rounded-xl border border-line bg-white p-2 shadow-lg">
          {isFetching && !data ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : groups.length === 0 ? (
            <p className="p-3 text-sm text-muted">No matches for “{debounced}”.</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="mb-1 last:mb-0">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(`${group.base}/${item.id}`)}
                    className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  >
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                    <span className="text-xs text-muted">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
