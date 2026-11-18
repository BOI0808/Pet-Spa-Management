// Luật hiển thị của CW-12 Thông báo (UI-Screens CW-12, mục 2.4, 2.5).
import type { IconName } from "@/components/icons";
import type { NotificationType } from "@/lib/api/types";
import { addDays, getStoreToday, toStoreDate, toStoreTime } from "@/lib/time";

export const NOTIFICATION_TABS = ["all", "unread"] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_LABELS: Record<NotificationTab, string> = {
  all: "Tất cả",
  unread: "Chưa đọc",
};

/** `?tab=` không hợp lệ hoặc không có → “Tất cả”. */
export function parseNotificationTab(value: string | null): NotificationTab {
  return NOTIFICATION_TABS.find((tab) => tab === value) ?? "all";
}

/** Ô biểu tượng theo `type` (UI-Screens 2.4 – NotificationType). */
export const NOTIFICATION_ICONS: Record<NotificationType, { icon: IconName; className: string }> = {
  BookingReceived: { icon: "calendar-plus", className: "bg-st-pending-bg text-st-pending" },
  ConfirmedAssigned: { icon: "check-circle", className: "bg-st-confirmed-bg text-st-confirmed" },
  StatusChanged: { icon: "clipboard", className: "bg-st-received-bg text-st-received" },
  Cancelled: { icon: "x-circle", className: "bg-st-cancelled-bg text-st-cancelled" },
  PaymentRecorded: { icon: "wallet", className: "bg-success-50 text-success" },
  CostConfirmation: { icon: "scale", className: "bg-apricot text-ink" },
};

/**
 * Thời gian theo múi giờ cửa hàng: hôm nay “09:03”, hôm qua “Hôm qua, 21:12”, trong năm “04/10, 08:30”,
 * năm khác “04/10/2025, 08:30”. `today` truyền vào để cả danh sách dùng chung một mốc.
 */
export function formatNotificationTime(createdAt: string, today: string = getStoreToday()) {
  const date = toStoreDate(createdAt);
  const time = toStoreTime(createdAt);
  if (date === today) return time;
  if (date === addDays(today, -1)) return `Hôm qua, ${time}`;
  const [year, month, day] = date.split("-");
  return year === today.slice(0, 4) ? `${day}/${month}, ${time}` : `${day}/${month}/${year}, ${time}`;
}
