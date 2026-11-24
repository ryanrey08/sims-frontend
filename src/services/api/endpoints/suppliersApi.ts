import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { Product, PurchaseOrder, Supplier } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export type SupplierInput = Omit<Supplier, "id" | "createdAt" | "updatedAt" | "orderCount" | "totalPurchased">;

export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSuppliers: build.query<Paginated<Supplier>, ListParams>({
      query: (params) => ({ url: "/suppliers", params: cleanParams(params) }),
      providesTags: (result) => provideListTags("Supplier", result?.data),
    }),
    getSupplier: build.query<Supplier, string>({
      query: (id) => `/suppliers/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Supplier", id }],
    }),
    getSupplierPurchaseOrders: build.query<PurchaseOrder[], string>({
      query: (id) => `/suppliers/${id}/purchase-orders`,
      providesTags: [{ type: "PurchaseOrder", id: LIST_ID }],
    }),
    getSupplierProducts: build.query<Product[], string>({
      query: (id) => `/suppliers/${id}/products`,
      providesTags: [{ type: "Product", id: LIST_ID }],
    }),
    createSupplier: build.mutation<Supplier, SupplierInput>({
      query: (body) => ({ url: "/suppliers", method: "POST", body }),
      invalidatesTags: [{ type: "Supplier", id: LIST_ID }, "Dashboard", "Activity"],
    }),
    updateSupplier: build.mutation<Supplier, { id: string; body: SupplierInput }>({
      query: ({ id, body }) => ({ url: `/suppliers/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Supplier", id }, { type: "Supplier", id: LIST_ID }, { type: "PurchaseOrder", id: LIST_ID }, { type: "Product", id: LIST_ID }, "Activity"],
    }),
    updateSupplierStatus: build.mutation<Supplier, { id: string; status: Supplier["status"] }>({
      query: ({ id, status }) => ({ url: `/suppliers/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Supplier", id }, { type: "Supplier", id: LIST_ID }, "Dashboard"],
    }),
    deleteSupplier: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Supplier", id }, { type: "Supplier", id: LIST_ID }, { type: "Product", id: LIST_ID }, "Dashboard", "Activity"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useGetSupplierPurchaseOrdersQuery,
  useGetSupplierProductsQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useUpdateSupplierStatusMutation,
  useDeleteSupplierMutation,
} = suppliersApi;
