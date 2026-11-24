import type { ActivityLog, DashboardSummary } from "@/types/models";
import { baseApi } from "../baseApi";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
}
export interface GlobalSearchResult {
  products: SearchHit[];
  suppliers: SearchHit[];
  purchaseOrders: SearchHit[];
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardSummary: build.query<DashboardSummary, { warehouseId?: string }>({
      query: (params) => ({ url: "/dashboard/summary", params: params.warehouseId ? params : undefined }),
      providesTags: ["Dashboard", "Stock"],
    }),
    getRecentActivities: build.query<ActivityLog[], { limit?: number } | void>({
      query: (params) => ({ url: "/dashboard/activities", params: params ?? undefined }),
      providesTags: ["Activity"],
    }),
    /** Used as a lazy query by the header search box. */
    globalSearch: build.query<GlobalSearchResult, string>({
      query: (q) => ({ url: "/search", params: { q } }),
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGetDashboardSummaryQuery, useGetRecentActivitiesQuery, useLazyGlobalSearchQuery } = dashboardApi;
