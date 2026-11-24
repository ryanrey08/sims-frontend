"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { SEGMENT_LABELS } from "@/config/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectBreadcrumbLabels } from "@/store/features/uiSlice";

/** Builds breadcrumbs from the URL; record ids are replaced by labels registered with useBreadcrumbLabel. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const labels = useAppSelector(selectBreadcrumbLabels);
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) return null;

  // "documents" and "masters" are route prefixes without their own page, so they are not shown.
  const crumbs = segments
    .map((segment, index) => ({
      segment,
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: labels[segment] ?? SEGMENT_LABELS[segment] ?? "Details",
    }))
    .filter((crumb) => crumb.segment !== "documents" && crumb.segment !== "masters");

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <li>
          <Link href="/dashboard" className="flex items-center hover:text-brand-900" aria-label="Dashboard">
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
              {last ? (
                <span aria-current="page" className="font-medium text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-brand-900">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
