"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, PackageX, Plus, ShoppingCart, Wallet } from "lucide-react";
import { Can } from "@/components/common/Can";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState, ErrorState } from "@/components/common/States";
import { BarChartView, LineChartView, PieChartView } from "@/components/charts";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { INBOUND_TYPES } from "@/constants/status";
import { useAppSelector } from "@/lib/redux/hooks";
import { formatCurrency, formatNumber, formatRelative } from "@/lib/utils/format";
import { useGetDashboardSummaryQuery, useGetRecentActivitiesQuery } from "@/services/api/endpoints/dashboardApi";
import { useGetWarehouseQuery } from "@/services/api/endpoints/warehousesApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import { selectWarehouseId } from "@/store/features/appContextSlice";

export function DashboardView() {
  const user = useAppSelector(selectCurrentUser);
  const warehouseId = useAppSelector(selectWarehouseId);
  // Refetch every 2 minutes so the overview stays current on wall displays.
  const { data, isLoading, error, refetch } = useGetDashboardSummaryQuery({ warehouseId: warehouseId || undefined }, { pollingInterval: 120000 });
  const { data: activities } = useGetRecentActivitiesQuery({ limit: 7 });
  const { data: warehouse } = useGetWarehouseQuery(warehouseId, { skip: !warehouseId });
  const totals = data?.totals;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  if (error && !data) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(" ")[0] ?? ""}`}
        description={warehouse ? `Inventory overview for ${warehouse.name}.` : "Inventory overview across all warehouses."}
        actions={
          <>
            <Can permission={PERMISSIONS.requisitionsCreate}>
              <ButtonLink href="/requisitions/new" variant="outline" leftIcon={<ClipboardList className="h-4 w-4" />}>New requisition</ButtonLink>
            </Can>
            <Can permission={PERMISSIONS.purchasingManage}>
              <ButtonLink href="/purchase-orders/new" leftIcon={<Plus className="h-4 w-4" />}>New purchase order</ButtonLink>
            </Can>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inventory value" value={formatCurrency(totals?.inventoryValue ?? 0, true)} hint={`${formatNumber(totals?.totalUnits ?? 0)} units · ${totals?.products ?? 0} products`} icon={Wallet} loading={isLoading} />
        <StatCard label="Low stock" value={totals?.lowStock ?? 0} hint="At or below reorder level" icon={AlertTriangle} accent="amber" loading={isLoading} />
        <StatCard label="Out of stock" value={totals?.outOfStock ?? 0} hint="Needs replenishment now" icon={PackageX} accent="rose" loading={isLoading} />
        <StatCard label="Pending approvals" value={(totals?.pendingPurchaseOrders ?? 0) + (totals?.pendingRequisitions ?? 0)} hint={`${totals?.pendingPurchaseOrders ?? 0} POs · ${totals?.pendingRequisitions ?? 0} requisitions`} icon={ShoppingCart} accent="purple" loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Stock movement" description="Units in vs. out over the last 14 days" />
          <CardContent>
            {data ? <LineChartView data={data.movementTrend} series={[{ key: "inbound", label: "Inbound" }, { key: "outbound", label: "Outbound" }]} /> : <Skeleton className="h-[280px]" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Stock health" description="Active products by stock status" />
          <CardContent>{data ? <PieChartView data={data.stockStatus} /> : <Skeleton className="h-[260px]" />}</CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Reorder alerts"
            description="Products at or below their reorder level"
            actions={<ButtonLink href="/products?stockStatus=low-stock" variant="ghost" size="sm">View all</ButtonLink>}
          />
          {isLoading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div>
          ) : data?.lowStockItems.length ? (
            <ul className="divide-y divide-line">
              {data.lowStockItems.map((product) => {
                const percent = Math.min(100, Math.round(((product.totalStock ?? 0) / Math.max(product.reorderLevel, 1)) * 100));
                return (
                  <li key={product.id}>
                    <Link href={`/products/${product.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div className={percent === 0 ? "h-full bg-red-500" : "h-full bg-amber-500"} style={{ width: `${Math.max(percent, 3)}%` }} />
                          </div>
                          <span className="text-xs text-muted">{product.totalStock} / {product.reorderLevel} {product.unit}</span>
                        </div>
                      </div>
                      <StatusBadge status={product.stockStatus} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Boxes} title="All stocked up" description="No products are below their reorder level." />
          )}
        </Card>
        <Card>
          <CardHeader title="Value by category" />
          <CardContent>
            {data ? <BarChartView data={data.valueByCategory.slice(0, 6)} series={[{ key: "value", label: "Value (₱)" }]} layout="vertical" height={300} /> : <Skeleton className="h-[300px]" />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Recent stock movements" actions={<ButtonLink href="/inventory/movements" variant="ghost" size="sm">View all</ButtonLink>} />
          <ul className="divide-y divide-line">
            {data?.recentMovements.map((movement) => {
              const inbound = (INBOUND_TYPES as readonly string[]).includes(movement.type);
              return (
                <li key={movement.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{movement.productName}</p>
                    <p className="text-xs text-muted">{movement.reference} · {movement.warehouseName} · {formatRelative(movement.createdAt)}</p>
                  </div>
                  <StatusBadge status={movement.type} />
                  <span className={inbound ? "w-16 text-right text-sm font-semibold text-emerald-700" : "w-16 text-right text-sm font-semibold text-red-600"}>
                    {inbound ? "+" : "−"}{movement.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          <ul className="divide-y divide-line">
            {(activities ?? []).map((activity) => (
              <li key={activity.id} className="px-5 py-3 text-sm">
                <span className="font-medium">{activity.actor}</span> {activity.action} <span className="font-medium">{activity.target}</span>
                <span className="mt-0.5 block text-xs text-muted">{activity.module} · {formatRelative(activity.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
