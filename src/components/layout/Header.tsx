"use client";

import Link from "next/link";
import { CircleHelp, Menu } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

/** White top bar from the mockups: menu toggle, logo, search (right-aligned), bell, help, account. */
export function Header({ onToggleSidebar, onOpenMobileNav }: { onToggleSidebar: () => void; onOpenMobileNav: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-3 sm:px-5">
      <button type="button" onClick={onOpenMobileNav} className="rounded-md p-2 text-ink hover:bg-slate-100 lg:hidden" aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </button>
      <button type="button" onClick={onToggleSidebar} className="hidden rounded-md p-2 text-ink hover:bg-slate-100 lg:block" aria-label="Collapse or expand sidebar">
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/dashboard" aria-label="SIMS home" className="shrink-0">
        <Logo />
      </Link>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <GlobalSearch />
        <NotificationsMenu />
        <Link href="/profile" className="hidden rounded-full p-1 text-ink hover:bg-slate-100 sm:block" aria-label="Help">
          <CircleHelp className="h-6 w-6" strokeWidth={1.8} />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
