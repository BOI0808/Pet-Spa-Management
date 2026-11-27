// Luật hiển thị của SW-13 Thông báo (UI-Screens SW-13, mục 2.4, 2.5). Giữ cùng cách làm với CW-12 của Web Khách hàng.
import type { IconName } from "@/components/icons";
import type { Notification, NotificationType } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/labels";
import { addDays, getStoreToday, toStoreDate, toStoreTime } from "@/lib/time";

/** Ô biểu tượng theo `type` (UI-Screens 2.4 – NotificationType; phân công dùng `#i-user-plus` như ui-demo SW-13). */
export const NOTIFICATION_ICONS: Record<NotificationType, { icon: IconName; className: string }> = {
  BookingReceived: { icon: "calendar-plus", className: "bg-st-pending-bg text-st-pending" },
  ConfirmedAssigned: { icon: "user-plus", className: "bg-st-confirmed-bg text-st-confirmed" },
  StatusChanged: { icon: "clipboard", className: "bg-st-received-bg text-st-received" },
  Cancelled: { icon: "x-circle", className: "bg-st-cancelled-bg text-st-cancelled" },
  PaymentRecorded: { icon: "wallet", className: "bg-success-50 text-success" },
  CostConfirmation: { icon: "scale", className: "bg-apricot text-ink" },
};

/**
 * Dòng đậm của một thông báo. API chỉ có `message` nên tiêu đề ghép từ `type` và mã lịch, theo câu của ui-demo:
 * “Bạn được phân công lịch LH-…”, “Lịch LH-… đã hủy”. Không có mã lịch hoặc loại khác → nhãn theo loại.
 */
export function notificationTitle({ type, appointmentId }: Pick<Notification, "type" | "appointmentId">) {
  if (appointmentId && type === "ConfirmedAssigned") return `Bạn được phân công lịch ${formatAppointmentCode(appointmentId)}`;
  if (appointmentId && type === "Cancelled") return `Lịch ${formatAppointmentCode(appointmentId)} đã hủy`;
  return NOTIFICATION_TYPE_LABELS[type];
}

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
