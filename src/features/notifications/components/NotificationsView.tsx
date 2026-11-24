"use client";

import { Bell as BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/services/api/endpoints/notificationsApi";

const dots = { info: "bg-sky-500", success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500" };

export function NotificationsView() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data, isLoading, error, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const unread = data?.filter((item) => !item.read).length ?? 0;
  const items = (data ?? []).filter((item) => tab === "all" || !item.read);

  return (
    <>
      <PageHeader
        icon={BellIcon}
        title="Notifications"
        description="Alerts about stock, approvals and deliveries."
        actions={<Button variant="outline" onClick={() => markAll()} loading={markingAll} disabled={!unread} leftIcon={<CheckCheck className="h-4 w-4" />}>Mark all as read</Button>}
      />
      <Card>
        <Tabs label="Notification filter" className="px-3" value={tab} onChange={setTab} items={[{ value: "all", label: "All", count: data?.length }, { value: "unread", label: "Unread", count: unread }]} />
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="You're all caught up" />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!item.read) markRead(item.id);
                    if (item.link) router.push(item.link);
                  }}
                  className={cn("flex w-full gap-4 px-5 py-4 text-left hover:bg-slate-50", !item.read && "bg-brand-50/40")}
                >
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dots[item.type])} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", item.read ? "text-slate-700" : "font-semibold text-ink")}>{item.title}</span>
                    <span className="block text-sm text-muted">{item.message}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
