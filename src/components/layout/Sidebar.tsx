"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAVIGATION, type NavItem } from "@/config/navigation";
import { usePermissions } from "@/hooks/usePermission";
import { cn } from "@/lib/utils/cn";

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The most specific child whose href matches the current path. */
function activeChild(pathname: string, children: NavItem[]) {
  return children
    .filter((child) => matches(pathname, child.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = usePermissions();
  const children = item.children?.filter((child) => can(child.permission)) ?? [];
  const currentChild = activeChild(pathname, children);
  const active = children.length ? Boolean(currentChild) : matches(pathname, item.href);
  const [open, setOpen] = useState(active);
  const expanded = open || active;
  const Icon = item.icon;
  const base = cn(
    "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors",
    active ? "bg-brand-600 text-white" : "text-slate-100 hover:bg-sidebar-hover hover:text-white",
    collapsed && "justify-center px-2",
  );

  if (children.length && !collapsed) {
    return (
      <li>
        <button type="button" className={base} aria-expanded={expanded} onClick={() => setOpen((value) => !value)}>
          {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
        {expanded && (
          <ul className="mt-1 space-y-0.5 pl-4">
            {children.map((child) => {
              const childActive = child === currentChild;
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={childActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] transition-colors",
                      childActive ? "bg-brand-600 font-semibold text-white" : "text-slate-200 hover:bg-sidebar-hover hover:text-white",
                    )}
                  >
                    <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
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

  const href = currentChild?.href ?? children[0]?.href ?? item.href;
  return (
    <li>
      <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} className={base}>
        {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
        {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
      </Link>
    </li>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { can } = usePermissions();
  const items = NAVIGATION.flatMap((section) => section.items).filter(
    (item) => can(item.permission) || item.children?.some((child) => can(child.permission)),
  );
  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-16 z-20 hidden flex-col bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
