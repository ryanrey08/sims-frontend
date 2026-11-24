import { createApi } from "@reduxjs/toolkit/query/react";
import { API_TAGS } from "./apiTags";
import { appBaseQuery } from "./baseQuery";

/**
 * The one RTK Query API slice for the whole app.
 * Feature endpoints are added with `baseApi.injectEndpoints` in `./endpoints`.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: appBaseQuery,
  tagTypes: API_TAGS,
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  endpoints: () => ({}),
});
