import type { ListParams, Paginated } from "@/types/api";
import type { DocumentItem, FieldValue, TransactionDocument } from "@/types/records";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";

export interface DocumentInput {
  date: string;
  fields: Record<string, FieldValue>;
  items: DocumentItem[];
  remarks?: string;
  /** true submits for approval; false saves a draft. */
  submit: boolean;
}

/** Posting a document can change stock, movements, property records, dashboards and reports. */
const POSTING_TAGS = ["Document", "Stock", "Movement", "Dashboard", "Report", "Master", "Activity", "Notification"] as const;

/** Generic transaction documents (transfers, adjustments, IAR, RIS, returns, counts, property documents). */
export const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDocuments: build.query<Paginated<TransactionDocument>, { type: string; params?: ListParams }>({
      query: ({ type, params }) => ({ url: `/documents/${type}`, params: cleanParams(params) }),
      providesTags: (result, _error, { type }) => [
        ...(result?.data ?? []).map((doc) => ({ type: "Document" as const, id: doc.id })),
        { type: "Document", id: `${type}:LIST` },
      ],
    }),
    getDocumentSummary: build.query<Record<string, { total: number; pending: number }>, void>({
      query: () => "/documents/summary",
      providesTags: ["Document"],
    }),
    getDocument: build.query<TransactionDocument, { type: string; id: string }>({
      query: ({ type, id }) => `/documents/${type}/${id}`,
      providesTags: (_result, _error, { id }) => [{ type: "Document", id }],
    }),
    saveDocument: build.mutation<TransactionDocument, { type: string; id?: string; body: DocumentInput }>({
      query: ({ type, id, body }) => ({ url: id ? `/documents/${type}/${id}` : `/documents/${type}`, method: id ? "PUT" : "POST", body }),
      invalidatesTags: ["Document", "Activity"],
    }),
    documentAction: build.mutation<TransactionDocument, { type: string; id: string; action: "submit" | "approve" | "reject" | "cancel"; remarks?: string }>({
      query: ({ type, id, action, remarks }) => ({ url: `/documents/${type}/${id}/${action}`, method: "POST", body: { remarks } }),
      // Write the returned document straight into its detail cache, then refresh dependents.
      async onQueryStarted({ type, id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(documentsApi.util.upsertQueryData("getDocument", { type, id }, data));
        } catch {
          // shown by the caller
        }
      },
      invalidatesTags: (result) => (result?.status === "posted" ? [...POSTING_TAGS] : ["Document", "Activity"]),
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useGetDocumentSummaryQuery,
  useGetDocumentQuery,
  useSaveDocumentMutation,
  useDocumentActionMutation,
} = documentsApi;
