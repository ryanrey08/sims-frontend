"use client";

import { Menu } from "lucide-react";
import { ContextSwitcher } from "./ContextSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <ContextSwitcher />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
