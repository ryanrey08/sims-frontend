"use client";

import { useMemo } from "react";
import { getMasterData } from "@/config/masterData";
import { useGetMasterRecordsQuery } from "@/services/api/endpoints/mastersApi";
import { useGetProductsQuery } from "@/services/api/endpoints/productsApi";
import { useGetSuppliersQuery } from "@/services/api/endpoints/suppliersApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { SelectOption } from "@/components/ui/Select";

/**
 * Options for a reference field (`optionsFrom` in the configs). Each source is a
 * conditional query, so only the one in use is fetched; results are cached and shared.
 */
export function useReferenceOptions(source: string | undefined): { options: SelectOption[]; loading: boolean } {
  const master = source ? getMasterData(source) : undefined;
  const warehouses = useGetWarehousesQuery({ status: "active", pageSize: 100 }, { skip: source !== "warehouses" });
  const suppliers = useGetSuppliersQuery({ status: "active", pageSize: 100, sortBy: "name" }, { skip: source !== "suppliers" });
  const products = useGetProductsQuery({ status: "active", pageSize: 200, sortBy: "name" }, { skip: source !== "products" });
  const masters = useGetMasterRecordsQuery({ resource: source ?? "", params: { pageSize: 200 } }, { skip: !master });

  return useMemo(() => {
    if (source === "warehouses") return { options: (warehouses.data?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id })), loading: warehouses.isLoading };
    if (source === "suppliers") return { options: (suppliers.data?.data ?? []).map((item) => ({ label: `${item.code} – ${item.name}`, value: item.id })), loading: suppliers.isLoading };
    if (source === "products") return { options: (products.data?.data ?? []).map((item) => ({ label: `${item.sku} — ${item.name}`, value: item.id })), loading: products.isLoading };
    if (master) {
      return {
        options: (masters.data?.data ?? [])
          .filter((record) => !["inactive", "disposed", "lost"].includes(String(record.status)))
          .map((record) => ({
            label: source === "employees" ? `${record.name} — ${record.position}` : `${record[master.codeField]} — ${record[master.labelField]}`,
            value: record.id,
          })),
        loading: masters.isLoading,
      };
    }
    return { options: [], loading: false };
  }, [source, master, warehouses, suppliers, products, masters]);
}
