"use client";

import type { Permission } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermission";

/** Renders children only when the user has the permission. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
