import type { AppointmentStatus } from "@/lib/api/types";

/** Quản lý hủy được lịch ở mọi trạng thái trước Hoàn tất; “Đã hủy” là trạng thái kết thúc (BR-14; AppointmentLifecycle.EnsureCancel của backend). */
export function canCancelAppointment(status: AppointmentStatus) {
  return status !== "Completed" && status !== "Cancelled";
}

/**
 * Quản lý chỉ đổi được lịch Chờ xác nhận hoặc Đã xác nhận (Appointment.EnsureManagerCanChange của backend);
 * các trạng thái còn lại trả 409 INVALID_TRANSITION nên web không hiện nút “Đổi lịch”.
 */
export function canChangeAppointment(status: AppointmentStatus) {
  return status === "Pending" || status === "Confirmed";
}
