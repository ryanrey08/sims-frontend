import type { MessageResponse } from "@/types/api";
import type { AppNotification } from "@/types/models";
import { baseApi } from "../baseApi";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<AppNotification[], void>({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markNotificationRead: build.mutation<AppNotification, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      // Optimistic: mark as read immediately, undo if the request fails.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationsApi.util.updateQueryData("getNotifications", undefined, (draft) => {
            const item = draft.find((notification) => notification.id === id);
            if (item) item.read = true;
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
    markAllNotificationsRead: build.mutation<MessageResponse, void>({
      query: () => ({ url: "/notifications/read-all", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationsApi.util.updateQueryData("getNotifications", undefined, (draft) => {
            draft.forEach((notification) => {
              notification.read = true;
            });
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } =
  notificationsApi;
