// SW-10 Trả thú cưng lưu trú – các hàm thuần (UI-Screens.md, FR-HTL-09, BR-22, G-12). Không gọi API ở đây.
import type { Appointment, Payment } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { toStoreDate, toStoreTime } from "@/lib/time";

/** “18:00, 06/10” – mốc nhận, trả trong ba ô thông tin (ui-demo SW-10). */
export function formatStayMoment(isoDateTime: string) {
  return `${toStoreTime(isoDateTime)}, ${formatDayMonth(toStoreDate(isoDateTime))}`;
}

/**
 * Mốc dùng để báo sớm/trễ (vùng 3, 4). Backend ghi `actualCheckOut` ở lần bấm xác nhận đầu tiên (G-12, kể cả khi trả 409
 * vì có phí trễ) và tính phí theo mốc đó, nên đã có thì dùng nó; chưa có thì dùng giờ hiện tại để báo trước cho khách.
 */
export function checkOutMoment(appointment: Appointment, nowMs: number) {
  return appointment.actualCheckOut ? Date.parse(appointment.actualCheckOut) : nowMs;
}

/**
 * Số phút so với giờ trả dự kiến: dương = trễ, âm = sớm. Làm tròn xuống theo phút như backend (`lateMinutes` ở SW-09)
 * để “trễ 30 phút 40 giây” vẫn hiện 30 phút. Không có giờ trả dự kiến → `null`.
 */
export function minutesFromPlanned(appointment: Appointment, momentMs: number) {
  if (!appointment.plannedCheckOut) return null;
  const diff = (momentMs - Date.parse(appointment.plannedCheckOut)) / 60_000;
  return diff >= 0 ? Math.floor(diff) : -Math.floor(-diff);
}

/** “04/10, tiền mặt” dưới tên khoản đã thu (ui-demo SW-10 vùng 5); chưa thu → `null`. */
export function paidLine(payment: Payment | undefined) {
  if (payment?.status !== "Paid") return null;
  const parts = [
    payment.paidAt && `${toStoreTime(payment.paidAt)} ${formatDayMonth(toStoreDate(payment.paidAt))}`,
    payment.method && PAYMENT_METHOD_LABELS[payment.method].toLocaleLowerCase("vi-VN"),
  ];
  return parts.filter(Boolean).join(", ");
}

/** Lịch Đang lưu trú để chọn khi mở SW-10 không có `?appointmentId=` (Đề xuất): sắp theo giờ trả dự kiến, sớm trước. */
export function sortByPlannedCheckOut(stays: Appointment[]) {
  return [...stays].sort(
    (a, b) => Date.parse(a.plannedCheckOut ?? a.createdAt) - Date.parse(b.plannedCheckOut ?? b.createdAt),
  );
}
