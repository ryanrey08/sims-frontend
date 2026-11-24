"use client";

import Link from "next/link";
import { Boxes, MapPin, Plus, User, Warehouse as WarehouseIcon } from "lucide-react";
import { Can } from "@/components/common/Can";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState, ErrorState } from "@/components/common/States";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";

export function WarehousesListView() {
  const { data, isLoading, error, refetch } = useGetWarehousesQuery({ pageSize: 100, sortBy: "code" });

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Storage locations, their managers and the stock each one holds."
        actions={
          <Can permission={PERMISSIONS.warehousesManage}>
            <ButtonLink href="/warehouses/new" leftIcon={<Plus className="h-4 w-4" />}>Add warehouse</ButtonLink>
          </Can>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-52" />)}
        </div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.data.length ? (
        <Card><EmptyState title="No warehouses yet" description="Add a warehouse to start tracking stock." /></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((warehouse) => (
            <li key={warehouse.id}>
              <Link href={`/warehouses/${warehouse.id}`} className="block h-full rounded-xl focus-visible:outline-offset-4">
                <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-brand-50 p-2.5 text-brand-900"><WarehouseIcon className="h-5 w-5" /></span>
                      <div>
                        <p className="font-semibold text-ink">{warehouse.name}</p>
                        <p className="font-mono text-xs text-muted">{warehouse.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={warehouse.type} />
                      {warehouse.status !== "active" && <StatusBadge status={warehouse.status} />}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-muted">
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{warehouse.address}</p>
                    <p className="flex items-center gap-2"><User className="h-4 w-4" />{warehouse.manager}</p>
                  </div>
                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted">Items</dt>
                      <dd className="text-sm font-semibold">{warehouse.itemCount}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted">Units</dt>
                      <dd className="text-sm font-semibold">{formatNumber(warehouse.totalUnits ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted">Value</dt>
                      <dd className="text-sm font-semibold">{formatCurrency(warehouse.stockValue ?? 0, true)}</dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Boxes className="h-4 w-4" /> Values use each product&apos;s current unit cost.</p>
    </>
  );
}
