import type { MovementReport, PurchasingReport, ValuationReport } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";

export interface ReportFilters {
  warehouseId?: string;
  categoryId?: string;
  supplierId?: string;
  from?: string;
  to?: string;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getValuationReport: build.query<ValuationReport, ReportFilters>({
      query: (params) => ({ url: "/reports/valuation", params: cleanParams(params) }),
      providesTags: ["Report"],
    }),
    getMovementReport: build.query<MovementReport, ReportFilters>({
      query: (params) => ({ url: "/reports/movements", params: cleanParams(params) }),
      providesTags: ["Report"],
    }),
    getPurchasingReport: build.query<PurchasingReport, ReportFilters>({
      query: (params) => ({ url: "/reports/purchasing", params: cleanParams(params) }),
      providesTags: ["Report"],
    }),
  }),
});

export const { useGetValuationReportQuery, useGetMovementReportQuery, useGetPurchasingReportQuery } = reportsApi;
