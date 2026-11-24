"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { NAVIGATION, type NavItem } from "@/config/navigation";
import { usePermissions } from "@/hooks/usePermission";
import { cn } from "@/lib/utils/cn";

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const children = item.children?.filter((child) => can(child.permission)) ?? [];
  const active = isActive(pathname, item.href);
  const [open, setOpen] = useState(active);
  const Icon = item.icon;
  const base = cn(
    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active ? "bg-white/12 text-white" : "text-brand-100 hover:bg-white/8 hover:text-white",
    collapsed && "justify-center px-2",
  );

  if (children.length > 1 && !collapsed) {
    return (
      <li>
        <button type="button" className={base} aria-expanded={open || active} onClick={() => setOpen((value) => !value)}>
          {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", (open || active) && "rotate-180")} aria-hidden />
        </button>
        {(open || active) && (
          <ul className="ml-8 mt-1 space-y-1 border-l border-white/15 pl-3">
            {children.map((child) => {
              const childActive = isActive(pathname, child.href, child.href === item.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={childActive ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      childActive ? "bg-accent-400 font-semibold text-brand-950" : "text-brand-100 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(base, active && "bg-accent-400 text-brand-950 hover:bg-accent-400 hover:text-brand-950")}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
        {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
      </Link>
    </li>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { can } = usePermissions();
  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
      {NAVIGATION.map((section) => {
        const items = section.items.filter((item) => can(item.permission));
        if (!items.length) return null;
        return (
          <div key={section.title} className="mb-5">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-300">{section.title}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/15" aria-hidden />
            )}
            <ul className="space-y-1">
              {items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col bg-brand-900 transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center" : "px-5")}>
        <Link href="/dashboard" aria-label="SIMS home">
          <Logo collapsed={collapsed} light />
        </Link>
      </div>
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={onToggle}
        className="flex h-12 items-center justify-center gap-2 border-t border-white/10 text-sm text-brand-200 hover:bg-white/5 hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
