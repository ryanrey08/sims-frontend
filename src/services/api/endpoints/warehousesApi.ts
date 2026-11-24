import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { Warehouse } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export type WarehouseInput = Omit<Warehouse, "id" | "createdAt" | "updatedAt" | "itemCount" | "totalUnits" | "stockValue">;

export const warehousesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWarehouses: build.query<Paginated<Warehouse>, ListParams | void>({
      query: (params) => ({ url: "/warehouses", params: cleanParams(params ?? { pageSize: 100 }) }),
      providesTags: (result) => [...provideListTags("Warehouse", result?.data), "Stock"],
    }),
    getWarehouse: build.query<Warehouse, string>({
      query: (id) => `/warehouses/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Warehouse", id }, "Stock"],
    }),
    createWarehouse: build.mutation<Warehouse, WarehouseInput>({
      query: (body) => ({ url: "/warehouses", method: "POST", body }),
      invalidatesTags: [{ type: "Warehouse", id: LIST_ID }, "Activity"],
    }),
    updateWarehouse: build.mutation<Warehouse, { id: string; body: WarehouseInput }>({
      query: ({ id, body }) => ({ url: `/warehouses/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Warehouse", id }, { type: "Warehouse", id: LIST_ID }, "Stock", "Activity"],
    }),
    deleteWarehouse: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/warehouses/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Warehouse", id }, { type: "Warehouse", id: LIST_ID }],
    }),
  }),
});

export const { useGetWarehousesQuery, useGetWarehouseQuery, useCreateWarehouseMutation, useUpdateWarehouseMutation, useDeleteWarehouseMutation } =
  warehousesApi;
