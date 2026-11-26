"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { Unauthorized } from "@/components/common/Unauthorized";
import { firstAllowedPath, requiredPermissionFor } from "@/config/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { usePermissions } from "@/hooks/usePermission";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils/cn";
import { useGetMeQuery } from "@/services/api/endpoints/authApi";
import { selectAuthStatus } from "@/store/features/authSlice";
import { mobileNavSet, selectMobileNavOpen, selectSidebarCollapsed, sidebarToggled } from "@/store/features/uiSlice";
import { Breadcrumbs } from "./Breadcrumbs";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

/**
 * Authenticated application shell: guards the session, checks route permissions,
 * and renders the sidebar, header and breadcrumbs.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const mobileOpen = useAppSelector(selectMobileNavOpen);
  const { can } = usePermissions();
  const hydrated = useHydrated();

  // Re-validate the session (and refresh permissions) with the API.
  useGetMeQuery(undefined, { skip: status !== "authenticated" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  const closeMobile = useCallback(() => dispatch(mobileNavSet(false)), [dispatch]);

  if (!hydrated || status !== "authenticated") return <FullPageLoader />;

  const required = requiredPermissionFor(pathname);
  const allowed = can(required);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Header onToggleSidebar={() => dispatch(sidebarToggled())} onOpenMobileNav={() => dispatch(mobileNavSet(true))} />
      <Sidebar collapsed={collapsed} />
      <MobileNav open={mobileOpen} onClose={closeMobile} />
      <div className={cn("flex min-h-screen flex-col pt-16 transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <main id="main-content" className="w-full flex-1 px-4 py-4 sm:px-6">
          <Breadcrumbs />
          {allowed ? children : <Unauthorized homeHref={firstAllowedPath(can)} />}
        </main>
      </div>
    </div>
  );
}
