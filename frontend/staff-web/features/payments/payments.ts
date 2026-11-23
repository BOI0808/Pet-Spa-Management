// SW-09 Thanh toán tại quầy – các hàm thuần: khoản nào đến hạn, mô tả phiếu, nơi quay về sau khi thu (UI-Screens.md).
import type { Appointment, Payment, PaymentKind } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth } from "@/lib/format";
import { checkInRoute, ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";

/**
 * Loại khoản được thu ở trạng thái hiện tại của lịch (BR-07): spa khi Hoàn tất; tiền lưu trú khi Đã xác nhận (trước khi
 * tiếp nhận); phí trả muộn khi Đang lưu trú (lúc trả thú cưng). Trạng thái khác thì không có khoản nào được thu.
 * Mỗi trạng thái chỉ có một loại nên một lịch có tối đa một khoản cần thu, chọn khoản bằng `appointmentId` là đủ.
 */
export function dueKindOf(appointment: Appointment): PaymentKind | null {
  if (appointment.type === "Spa") return appointment.status === "Completed" ? "Spa" : null;
  if (appointment.status === "Confirmed") return "Stay";
  if (appointment.status === "InStay") return "LateFee";
  return null;
}

/** Khoản Chưa thanh toán đúng loại đến hạn; không có (đã thu, chưa phát sinh phí trễ…) → `undefined`. */
export function findDuePayment(appointment: Appointment, payments: Payment[] | undefined) {
  const kind = dueKindOf(appointment);
  return payments?.find((payment) => payment.kind === kind && payment.status === "Unpaid");
}

/** Chữ dưới số tiền ở cuống phiếu (ui-demo SW-09). */
export const DUE_STUB_LABELS: Record<PaymentKind, string> = {
  Spa: "Spa",
  Stay: "Lưu trú",
  LateFee: "Phí trễ",
};

/** Tên khoản trên đầu thẻ: “Cốm: tiền lưu trú”. */
export const DUE_TITLE_LABELS: Record<PaymentKind, string> = {
  Spa: "lịch spa",
  Stay: "tiền lưu trú",
  LateFee: "phí trả muộn",
};

/** Dòng mô tả của phiếu: “Lịch spa đã hoàn tất, LH-…”, “Tiền lưu trú, nhận 10:00 hôm nay”, “Phí trả muộn, LH-…”. */
export function describeDue(appointment: Appointment, kind: PaymentKind, today: string) {
  const code = formatAppointmentCode(appointment.appointmentId);
  if (kind === "Spa") return `Lịch spa đã hoàn tất, ${code}`;
  if (kind === "LateFee") return `Phí trả muộn, ${code}`;
  const checkIn = appointment.plannedCheckIn;
  if (!checkIn) return `Tiền lưu trú, ${code}`;
  const day = toStoreDate(checkIn) === today ? "hôm nay" : `ngày ${formatDayMonth(toStoreDate(checkIn))}`;
  return `Tiền lưu trú, nhận ${toStoreTime(checkIn)} ${day}`;
}

/** Nội dung chuyển khoản “LH<mã>” (UI-Screens SW-09 vùng 8): mã lịch bỏ dấu gạch để app ngân hàng không cắt. */
export function transferContent(appointmentId: string) {
  return formatAppointmentCode(appointmentId).replace("-", "");
}

/**
 * Nơi quay về sau khi thu (UI-Screens SW-09, Hành vi): tiền lưu trú → SW-07 để làm tiếp bước đưa bé vào chuồng; spa → SW-02.
 * Phí trả muộn theo tài liệu về SW-10, nhưng SW-10 làm ở thẻ 127 (chưa có trang) nên tạm về SW-02.
 */
export function returnRouteAfterPaid(kind: PaymentKind, appointmentId: string) {
  if (kind === "Stay") return checkInRoute(appointmentId);
  return ROUTES.appointments;
}

/** Số phút trả trễ so với giờ trả dự kiến; chưa có giờ trả thực tế hoặc không trễ → `null`. */
export function lateMinutes(appointment: Appointment) {
  const { plannedCheckOut, actualCheckOut } = appointment;
  if (!plannedCheckOut || !actualCheckOut) return null;
  const minutes = Math.floor((Date.parse(actualCheckOut) - Date.parse(plannedCheckOut)) / 60_000);
  return minutes > 0 ? minutes : null;
}
