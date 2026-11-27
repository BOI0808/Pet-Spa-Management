// SW-09 Thanh toán tại quầy – các hàm thuần: khoản nào đến hạn, mô tả phiếu, nơi quay về sau khi thu (UI-Screens.md).
import type { Appointment, AppointmentDetail, Payment, PaymentKind } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth } from "@/lib/format";
import { PAYMENT_KIND_LABELS } from "@/lib/labels";
import { checkInRoute, checkOutRoute, ROUTES } from "@/lib/routes";
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

/**
 * Lý do chưa được thu tiền lưu trú dù khoản đã đến hạn (review PR #82). Backend tạo khoản Stay khi quản lý xác nhận lịch
 * và không tính lại số tiền sau khi cân, nên phải đối chiếu cân nặng ở SW-07 trước (UF-03: cân → thu tiền → vào chuồng):
 * thu trước khi cân thì bé đổi nhóm kích cỡ sẽ làm khoản đã thu sai. Đang chờ khách xác nhận chi phí mới thì backend
 * từ chối thu (409 COST_CONFIRMATION_PENDING). Cùng điều kiện với nút “Thu tiền” ở SW-07 bước 2. Được thu → `null`.
 */
export function stayBlockReason(appointment: AppointmentDetail) {
  if (appointment.pendingCostConfirmation) return "Đang chờ khách xác nhận chi phí mới, chưa thu tiền lưu trú.";
  if (appointment.actualWeightKg == null) return "Cần đối chiếu cân nặng ở màn Tiếp nhận trước khi thu tiền lưu trú.";
  return null;
}

/**
 * Câu báo khi lịch mở bằng `?appointmentId=` không có khoản để thu. Lịch ở trạng thái có khoản đến hạn mà chưa có khoản
 * đó: tiền lưu trú thì báo quản lý kiểm tra (backend tạo khoản khi xác nhận lịch, lịch xác nhận trước khi có chức năng
 * này thì không có); phí trả muộn thì là bình thường – trả đúng giờ thì không phát sinh.
 */
export function noDueMessage(appointment: Appointment, payments: Payment[] | undefined) {
  const kind = dueKindOf(appointment);
  const paid = (payments ?? []).filter((payment) => payment.status === "Paid");
  // Đã thu khoản đang đến hạn, hoặc lịch đã qua mọi lúc thu (lưu trú Hoàn tất…) mà có khoản đã thu.
  if (paid.length > 0 && (kind === null || paid.some((payment) => payment.kind === kind))) {
    return `Lịch này không còn khoản cần thu. Đã thu: ${paid.map((payment) => PAYMENT_KIND_LABELS[payment.kind].toLowerCase()).join(", ")}.`;
  }
  if (kind === "Stay") return "Lịch này chưa có khoản tiền lưu trú trên hệ thống, chưa thể thu tiền. Báo quản lý kiểm tra.";
  if (kind === "LateFee") return "Lịch này không phát sinh phí trả muộn cần thu.";
  if (kind === "Spa") return "Lịch này chưa có khoản spa trên hệ thống, chưa thể thu tiền. Báo quản lý kiểm tra.";
  return "Lịch này chưa đến thời điểm thu tiền.";
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

/**
 * Dòng mô tả của phiếu: “Lịch spa đã hoàn tất, LH-…”, “Tiền lưu trú, nhận 10:00 hôm nay”, “Phí trả muộn, LH-…”. Tiền lưu
 * trú chưa cân thì thêm “, chưa cân” để lễ tân biết phải sang SW-07 trước (`stayBlockReason`).
 */
export function describeDue(appointment: Appointment, kind: PaymentKind, today: string) {
  const code = formatAppointmentCode(appointment.appointmentId);
  if (kind === "Spa") return `Lịch spa đã hoàn tất, ${code}`;
  if (kind === "LateFee") return `Phí trả muộn, ${code}`;
  const checkIn = appointment.plannedCheckIn;
  if (!checkIn) return `Tiền lưu trú, ${code}`;
  const day = toStoreDate(checkIn) === today ? "hôm nay" : `ngày ${formatDayMonth(toStoreDate(checkIn))}`;
  const weighNote = appointment.actualWeightKg == null ? ", chưa cân" : "";
  return `Tiền lưu trú, nhận ${toStoreTime(checkIn)} ${day}${weighNote}`;
}

/** Nội dung chuyển khoản “LH<mã>” (UI-Screens SW-09 vùng 8): mã lịch bỏ dấu gạch để app ngân hàng không cắt. */
export function transferContent(appointmentId: string) {
  return formatAppointmentCode(appointmentId).replace("-", "");
}

/**
 * Nơi quay về sau khi thu (UI-Screens SW-09, Hành vi): tiền lưu trú → SW-07 để làm tiếp bước đưa bé vào chuồng; phí trả
 * muộn → SW-10 để bấm lại “Xác nhận trả thú cưng”; spa → SW-02.
 */
export function returnRouteAfterPaid(kind: PaymentKind, appointmentId: string) {
  if (kind === "Stay") return checkInRoute(appointmentId);
  if (kind === "LateFee") return checkOutRoute(appointmentId);
  return ROUTES.appointments;
}

/** Số phút trả trễ so với giờ trả dự kiến; chưa có giờ trả thực tế hoặc không trễ → `null`. */
export function lateMinutes(appointment: Appointment) {
  const { plannedCheckOut, actualCheckOut } = appointment;
  if (!plannedCheckOut || !actualCheckOut) return null;
  const minutes = Math.floor((Date.parse(actualCheckOut) - Date.parse(plannedCheckOut)) / 60_000);
  return minutes > 0 ? minutes : null;
}
