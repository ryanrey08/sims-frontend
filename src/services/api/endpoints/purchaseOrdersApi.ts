import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export interface PurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate: string;
  notes?: string;
  /** "draft" saves without submitting; "pending" submits for approval. */
  status: "draft" | "pending";
  items: { productId: string; quantity: number; unitCost: number }[];
}

export interface ReceiveRequest {
  id: string;
  items: { productId: string; quantity: number }[];
  notes?: string;
}

export const purchaseOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPurchaseOrders: build.query<Paginated<PurchaseOrder>, ListParams>({
      query: (params) => ({ url: "/purchase-orders", params: cleanParams(params) }),
      providesTags: (result) => provideListTags("PurchaseOrder", result?.data),
    }),
    getPurchaseOrder: build.query<PurchaseOrder, string>({
      query: (id) => `/purchase-orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "PurchaseOrder", id }],
    }),
    createPurchaseOrder: build.mutation<PurchaseOrder, PurchaseOrderInput>({
      query: (body) => ({ url: "/purchase-orders", method: "POST", body }),
      invalidatesTags: [{ type: "PurchaseOrder", id: LIST_ID }, { type: "Supplier", id: LIST_ID }, "Dashboard", "Report", "Activity"],
    }),
    updatePurchaseOrder: build.mutation<PurchaseOrder, { id: string; body: PurchaseOrderInput }>({
      query: ({ id, body }) => ({ url: `/purchase-orders/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "PurchaseOrder", id }, { type: "PurchaseOrder", id: LIST_ID }, { type: "Supplier", id: LIST_ID }, "Report", "Activity"],
    }),
    updatePurchaseOrderStatus: build.mutation<PurchaseOrder, { id: string; status: PurchaseOrderStatus }>({
      query: ({ id, status }) => ({ url: `/purchase-orders/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "PurchaseOrder", id }, { type: "PurchaseOrder", id: LIST_ID }, { type: "Supplier", id: LIST_ID }, "Dashboard", "Report", "Activity"],
    }),
    receivePurchaseOrder: build.mutation<PurchaseOrder, ReceiveRequest>({
      query: ({ id, ...body }) => ({ url: `/purchase-orders/${id}/receive`, method: "POST", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "PurchaseOrder", id },
        { type: "PurchaseOrder", id: LIST_ID },
        "Stock",
        "Movement",
        "Dashboard",
        "Report",
        "Activity",
      ],
    }),
    deletePurchaseOrder: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/purchase-orders/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "PurchaseOrder", id }, { type: "PurchaseOrder", id: LIST_ID }, { type: "Supplier", id: LIST_ID }],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useReceivePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
} = purchaseOrdersApi;
