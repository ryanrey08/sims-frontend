"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/services/api/endpoints/notificationsApi";

const dots = { info: "bg-sky-500", success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500" };

export function NotificationsMenu() {
  const router = useRouter();
  // Poll every 60 seconds so new notifications appear without a reload.
  const { data = [] } = useGetNotificationsQuery(undefined, { pollingInterval: 60000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();
  const unread = data.filter((item) => !item.read).length;

  return (
    <Dropdown
      className="w-80 p-0"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="relative rounded-full p-1.5 text-ink hover:bg-slate-100"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-6 w-6" strokeWidth={1.8} />
          {unread > 0 && <span className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" aria-hidden />}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => markAll()}>
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.slice(0, 6).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (!item.read) markRead(item.id);
                    close();
                    if (item.link) router.push(item.link);
                  }}
                  className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none", !item.read && "bg-brand-50/50")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dots[item.type])} aria-hidden />
                  <span className="min-w-0">
                    <span className={cn("block text-sm", item.read ? "text-slate-600" : "font-semibold text-ink")}>{item.title}</span>
                    <span className="block text-xs text-muted">{item.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{formatRelative(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {data.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">You&apos;re all caught up.</li>}
          </ul>
          <Link href="/notifications" onClick={close} className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
