import type { ListParams, Paginated } from "@/types/api";
import type { Requisition, RequisitionStatus } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export interface RequisitionInput {
  department: string;
  warehouseId: string;
  neededBy: string;
  purpose: string;
  priority: Requisition["priority"];
  remarks?: string;
  items: { productId: string; quantity: number }[];
}

export const requisitionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRequisitions: build.query<Paginated<Requisition>, ListParams>({
      query: (params) => ({ url: "/requisitions", params: cleanParams(params) }),
      providesTags: (result) => provideListTags("Requisition", result?.data),
    }),
    getRequisition: build.query<Requisition, string>({
      query: (id) => `/requisitions/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Requisition", id }],
    }),
    createRequisition: build.mutation<Requisition, RequisitionInput>({
      query: (body) => ({ url: "/requisitions", method: "POST", body }),
      invalidatesTags: [{ type: "Requisition", id: LIST_ID }, "Dashboard", "Activity"],
    }),
    updateRequisitionStatus: build.mutation<Requisition, { id: string; status: RequisitionStatus; remarks?: string }>({
      query: ({ id, ...body }) => ({ url: `/requisitions/${id}/status`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Requisition", id }, { type: "Requisition", id: LIST_ID }, "Dashboard", "Activity"],
    }),
    issueRequisition: build.mutation<Requisition, { id: string; items: { productId: string; quantity: number }[] }>({
      query: ({ id, items }) => ({ url: `/requisitions/${id}/issue`, method: "POST", body: { items } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Requisition", id },
        { type: "Requisition", id: LIST_ID },
        "Stock",
        "Movement",
        "Dashboard",
        "Report",
        "Activity",
      ],
    }),
  }),
});

export const {
  useGetRequisitionsQuery,
  useGetRequisitionQuery,
  useCreateRequisitionMutation,
  useUpdateRequisitionStatusMutation,
  useIssueRequisitionMutation,
} = requisitionsApi;
