"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, House } from "lucide-react";
import { NAVIGATION, SEGMENT_LABELS, type NavItem } from "@/config/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectBreadcrumbLabels } from "@/store/features/uiSlice";

interface Crumb {
  href?: string;
  label: string;
}

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Finds the sidebar module and page for the current path (most specific match). */
function locate(pathname: string): { module?: NavItem; page?: NavItem } {
  let best: { module?: NavItem; page?: NavItem; length: number } = { length: 0 };
  for (const item of NAVIGATION.flatMap((section) => section.items)) {
    for (const child of item.children ?? [item]) {
      if (matches(pathname, child.href) && child.href.length > best.length) best = { module: item, page: child, length: child.href.length };
    }
  }
  return best;
}

/**
 * Breadcrumbs as drawn in the mockups: 🏠 › Module › Page › Sub-page.
 * The module and page come from the sidebar tree; deeper segments use labels
 * registered with useBreadcrumbLabel (e.g. a record's number).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const labels = useAppSelector(selectBreadcrumbLabels);
  if (pathname === "/dashboard") return null;

  const { module, page } = locate(pathname);
  const crumbs: Crumb[] = [];
  if (module && page) {
    if (module !== page) crumbs.push({ label: module.label });
    crumbs.push({ href: page.href, label: page.label });
    const rest = pathname.slice(page.href.length).split("/").filter(Boolean);
    rest.forEach((segment, index) => {
      const href = `${page.href}/${rest.slice(0, index + 1).join("/")}`;
      crumbs.push({ href, label: labels[segment] ?? SEGMENT_LABELS[segment] ?? "Details" });
    });
  } else {
    const segments = pathname.split("/").filter(Boolean).filter((segment) => segment !== "documents" && segment !== "masters");
    segments.forEach((segment, index) => crumbs.push({ href: `/${segments.slice(0, index + 1).join("/")}`, label: labels[segment] ?? SEGMENT_LABELS[segment] ?? "Details" }));
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink">
        <li>
          <Link href="/dashboard" className="flex items-center hover:text-brand-600" aria-label="Dashboard">
            <House className="h-4 w-4 fill-ink" />
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              {last ? (
                <span aria-current="page" className="font-bold">
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="hover:text-brand-600">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
