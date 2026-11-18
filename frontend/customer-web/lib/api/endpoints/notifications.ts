import { apiClient } from "@/lib/api/client";
import type { NotificationPage } from "@/lib/api/types";

export type NotificationListParams = { page: number; pageSize: number };

/** GET /notifications – FR-NOT-01 → 06. Backend chỉ trả thông báo gửi cho tài khoản đang đăng nhập (UC-34). */
export async function listNotifications(params: NotificationListParams) {
  const { data } = await apiClient.get<NotificationPage>("/notifications", { params });
  return data;
}

/** POST /notifications/{id}/read → 204. Thông báo của người khác → 403. */
export async function markNotificationRead(notificationId: string) {
  await apiClient.post(`/notifications/${encodeURIComponent(notificationId)}/read`);
}
