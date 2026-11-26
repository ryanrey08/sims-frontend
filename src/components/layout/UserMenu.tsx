"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserCog, UserRound } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermission";
import { useAppSelector } from "@/lib/redux/hooks";
import { useLogoutMutation } from "@/services/api/endpoints/authApi";
import { selectCurrentUser } from "@/store/features/authSlice";

export function UserMenu() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const { can } = usePermissions();
  const [logout] = useLogoutMutation();
  if (!user) return null;

  return (
    <Dropdown
      trigger={(props) => (
        <button type="button" {...props} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100" aria-label="Account menu">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600" aria-hidden>
            <UserRound className="h-5 w-5" />
          </span>
          <span className="hidden text-[13px] font-semibold text-ink sm:block">{user.name.split(" ")[0]}</span>
          <ChevronDown className="hidden h-4 w-4 text-ink sm:block" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="py-1">
            <DropdownItem onClick={() => (close(), router.push("/profile"))}>
              <UserCog className="h-4 w-4" /> My profile
            </DropdownItem>
            {can(PERMISSIONS.settingsManage) && (
              <DropdownItem onClick={() => (close(), router.push("/settings"))}>
                <Settings className="h-4 w-4" /> Settings
              </DropdownItem>
            )}
          </div>
          <div className="border-t border-line pt-1">
            <DropdownItem
              danger
              onClick={async () => {
                close();
                await logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownItem>
          </div>
        </>
      )}
    </Dropdown>
  );
}
