"use client";

import Link from "next/link";
import { CircleHelp, Menu } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ContextSwitcher } from "./ContextSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

/** Full-width white top bar: menu toggle, logo, search, notifications, help and account. */
export function Header({ onToggleSidebar, onOpenMobileNav }: { onToggleSidebar: () => void; onOpenMobileNav: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-3 sm:px-4">
      <button type="button" onClick={onOpenMobileNav} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </button>
      <button type="button" onClick={onToggleSidebar} className="hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:block" aria-label="Collapse or expand sidebar">
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/dashboard" aria-label="SIMS home" className="shrink-0">
        <Logo />
      </Link>
      <div className="ml-auto flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <GlobalSearch />
        <ContextSwitcher />
        <NotificationsMenu />
        <Link href="/profile" className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink sm:block" aria-label="Help and account">
          <CircleHelp className="h-5 w-5" />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
