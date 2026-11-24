"use client";

import { useCallback } from "react";
import type { Permission } from "@/constants/permissions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPermissionSet } from "@/store/features/authSlice";

/** Returns a checker for the signed-in user's permissions. */
export function usePermissions() {
  const permissions = useAppSelector(selectPermissionSet);
  const can = useCallback(
    (permission?: Permission | Permission[]) => {
      if (!permission) return true;
      const required = Array.isArray(permission) ? permission : [permission];
      return required.some((item) => permissions.has(item));
    },
    [permissions],
  );
  return { can, permissions };
}
