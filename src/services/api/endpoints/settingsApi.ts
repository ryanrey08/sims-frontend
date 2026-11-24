import type { MessageResponse } from "@/types/api";
import type { SystemSettings } from "@/types/models";
import { API_TAGS } from "../apiTags";
import { baseApi } from "../baseApi";

export type SettingsInput = Omit<SystemSettings, "updatedAt">;

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<SystemSettings, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: build.mutation<SystemSettings, SettingsInput>({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      invalidatesTags: ["Dashboard", "Activity", "Report"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(settingsApi.util.upsertQueryData("getSettings", undefined, data));
        } catch {
          // form shows the error
        }
      },
    }),
    /** Mock mode only: restores the seed data. */
    resetDemoData: build.mutation<MessageResponse, void>({
      query: () => ({ url: "/settings/reset-demo-data", method: "POST" }),
      invalidatesTags: API_TAGS.filter((tag) => tag !== "Auth"),
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useResetDemoDataMutation,
} = settingsApi;
