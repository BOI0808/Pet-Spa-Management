import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, AppointmentStatus, Photo, WeightCheck } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney } from "@/lib/format";
import type { ExecutionResult } from "@/lib/queries/appointments";

// MW-05 vùng 7 – Cập nhật trạng thái (FR-EXE-05; BR-05, BR-06, BR-20, BR-22, BR-23) – UI-Screens.md.

export type StatusAction = "checkInSpa" | "weightCheckHotel" | "checkInHotel" | "start" | "complete" | "checkOut";

export type StatusUpdatePlan = {
  action: StatusAction;
  /** Trạng thái hiện tại và bước kế tiếp hiển thị ở dòng “<hiện tại> → <kế tiếp>”. */
  from: AppointmentStatus;
  to: AppointmentStatus;
  /** Nhãn nút chính. */
  label: string;
  /** Có ô nhập cân nặng thực tế. */
  needsWeight: boolean;
  /** Lý do khóa nút; `null` khi bấm được. */
  lockReason: string | null;
};

/** Câu cố định của Frontend-Conventions 5.2 cho các mã 409 của bước thực hiện. */
export const COST_PENDING_REASON = "Đang chờ khách xác nhận chi phí mới.";
export const BEFORE_PHOTO_REASON = "Cần ảnh trước chăm sóc hợp lệ.";
export const COMPLETE_REASON = "Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.";

/**
 * Bước kế tiếp Quản lý có thể thực hiện, hoặc `null` khi lịch không còn bước nào ở đây (Chờ xác nhận → MW-04; Hoàn tất, Đã hủy).
 * `photos` là ảnh của lịch (`undefined` khi chưa tải được).
 *
 * Nút chỉ khóa khi web biết chắc backend sẽ từ chối. Ảnh trước thì không khóa theo ảnh của lịch này: backend chấp nhận ảnh trước gần
 * nhất của thú cưng trong thời hạn hiệu lực dù thuộc lịch khác (UI-Screens G-13), nên chỉ hiện lý do khi nhận 409 `PHOTO_REQUIRED`.
 */
export function getStatusUpdatePlan(appointment: AppointmentDetail, photos: readonly Photo[] | undefined): StatusUpdatePlan | null {
  const costPending = appointment.pendingCostConfirmation != null;

  if (appointment.type === "Spa") {
    switch (appointment.status) {
      case "Confirmed":
        return { action: "checkInSpa", from: "Confirmed", to: "Received", label: "Tiếp nhận", needsWeight: true, lockReason: null };
      case "Received":
        return {
          action: "start",
          from: "Received",
          to: "InProgress",
          label: "Bắt đầu thực hiện",
          needsWeight: false,
          lockReason: costPending ? COST_PENDING_REASON : null,
        };
      case "InProgress": {
        // BR-06: mọi dịch vụ xong; BR-20: có ảnh sau. Chưa biết (chưa tải được) thì để backend quyết định.
        const servicesIncomplete = appointment.services?.some((service) => !service.isDone) ?? false;
        const missingAfterPhoto = photos !== undefined && !photos.some((photo) => photo.kind === "After");
        return {
          action: "complete",
          from: "InProgress",
          to: "Completed",
          label: "Chuyển sang Hoàn tất",
          needsWeight: false,
          lockReason: servicesIncomplete || missingAfterPhoto ? COMPLETE_REASON : null,
        };
      }
      default:
        return null;
    }
  }

  switch (appointment.status) {
    case "Confirmed":
      // Bước 1 đối chiếu cân nặng (lịch lưu trú vẫn Đã xác nhận), bước 2 tiếp nhận khi đã có cân nặng thực tế.
      if (appointment.actualWeightKg == null) {
        return { action: "weightCheckHotel", from: "Confirmed", to: "InStay", label: "Đối chiếu cân nặng", needsWeight: true, lockReason: null };
      }
      return {
        action: "checkInHotel",
        from: "Confirmed",
        to: "InStay",
        label: "Tiếp nhận",
        needsWeight: false,
        lockReason: costPending ? COST_PENDING_REASON : null,
      };
    case "InStay":
      return { action: "checkOut", from: "InStay", to: "Completed", label: "Ghi nhận trả thú cưng", needsWeight: false, lockReason: null };
    default:
      return null;
  }
}

/** Lịch còn bước kế tiếp để hiện vùng 7 hay không; không phụ thuộc ảnh nên màn hình dùng để quyết định bố cục hai cột. */
export function hasStatusUpdateStep(appointment: AppointmentDetail) {
  return getStatusUpdatePlan(appointment, undefined) !== null;
}

/** Mã 409 có câu cố định hiện thành lý do dưới nút thay vì alert (Frontend-Conventions 5.2). */
export function getErrorReason(action: StatusAction, error: ApiError) {
  if (error.status !== 409) return null;
  if (error.code === "COST_CONFIRMATION_PENDING") return COST_PENDING_REASON;
  if (error.code === "SERVICES_INCOMPLETE") return COMPLETE_REASON;
  if (error.code === "PHOTO_REQUIRED") return action === "complete" ? COMPLETE_REASON : BEFORE_PHOTO_REASON;
  return null;
}

/** Ghi nhận tiền chưa đủ điều kiện (tiền lưu trú, phí trả muộn) nên cần dẫn Quản lý sang MW-10. */
export function needsPaymentFirst(error: ApiError) {
  return error.status === 409 && error.code === "PAYMENT_NOT_DUE";
}

// Câu bổ sung theo kết quả đối chiếu cân nặng (BR-23, BR-21).
function weightCheckNote(weightCheck: WeightCheck | undefined) {
  if (!weightCheck || weightCheck.result === "OK") return "";
  if (weightCheck.result === "NEEDS_CONFIRMATION") return COST_PENDING_REASON;
  const cost = weightCheck.newAmount === undefined ? "Chi phí được tính lại theo cân nặng mới." : `Chi phí mới ${formatMoney(weightCheck.newAmount)}.`;
  return weightCheck.cageSuitable === false ? `${cost} Chuồng đã gán không còn phù hợp, hãy đổi chuồng ở “Đổi lịch”.` : cost;
}

/** Câu toast thành công (UI demo: “Đã tiếp nhận Bông”, “Đã hoàn tất LH-…. Bàn giao Bông ra quầy.”, “Đã ghi nhận trả Tuyết.”). */
export function getSuccessMessage(action: StatusAction, appointment: AppointmentDetail, result: ExecutionResult) {
  const pet = appointment.petName ?? "thú cưng";
  const withNote = (message: string, note: string) => (note ? `${message}. ${note}` : message);

  switch (action) {
    case "checkInSpa":
      return withNote(`Đã tiếp nhận ${pet}`, weightCheckNote(result.weightCheck));
    case "weightCheckHotel":
      return withNote(`Đã đối chiếu cân nặng của ${pet}`, weightCheckNote(result.weightCheck));
    case "checkInHotel":
      return `Đã tiếp nhận ${pet} vào lưu trú`;
    case "start":
      return `Đã bắt đầu thực hiện cho ${pet}`;
    case "complete":
      return `Đã hoàn tất ${formatAppointmentCode(appointment.appointmentId)}. Bàn giao ${pet} ra quầy.`;
    case "checkOut":
      return withNote(`Đã ghi nhận trả ${pet}`, result.lateFee ? `Phí trả muộn ${formatMoney(result.lateFee)}.` : "");
  }
}
