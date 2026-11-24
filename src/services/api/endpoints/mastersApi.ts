import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { FieldValue, MasterRecord } from "@/types/records";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";

/** Generic CRUD for every master-data registry in config/masterData.ts. Cache tags are scoped per resource. */
export const mastersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMasterRecords: build.query<Paginated<MasterRecord>, { resource: string; params?: ListParams }>({
      query: ({ resource, params }) => ({ url: `/masters/${resource}`, params: cleanParams(params) }),
      providesTags: (result, _error, { resource }) => [
        ...(result?.data ?? []).map((record) => ({ type: "Master" as const, id: `${resource}:${record.id}` })),
        { type: "Master", id: `${resource}:LIST` },
      ],
    }),
    getMasterRecord: build.query<MasterRecord, { resource: string; id: string }>({
      query: ({ resource, id }) => `/masters/${resource}/${id}`,
      providesTags: (_result, _error, { resource, id }) => [{ type: "Master", id: `${resource}:${id}` }],
    }),
    saveMasterRecord: build.mutation<MasterRecord, { resource: string; id?: string; body: Record<string, FieldValue> }>({
      query: ({ resource, id, body }) => ({ url: id ? `/masters/${resource}/${id}` : `/masters/${resource}`, method: id ? "PUT" : "POST", body }),
      invalidatesTags: (_result, _error, { resource, id }) => [
        { type: "Master", id: `${resource}:LIST` },
        ...(id ? [{ type: "Master" as const, id: `${resource}:${id}` }] : []),
        "Document",
        "Report",
        "Activity",
      ],
    }),
    deleteMasterRecord: build.mutation<MessageResponse, { resource: string; id: string }>({
      query: ({ resource, id }) => ({ url: `/masters/${resource}/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { resource, id }) => [
        { type: "Master", id: `${resource}:LIST` },
        { type: "Master", id: `${resource}:${id}` },
        "Activity",
      ],
    }),
  }),
});

export const { useGetMasterRecordsQuery, useGetMasterRecordQuery, useSaveMasterRecordMutation, useDeleteMasterRecordMutation } = mastersApi;
