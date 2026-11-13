import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  ConfirmHotelRequest,
  ConfirmSpaRequest,
  HotelSuggestions,
  RejectResult,
  SpaSuggestions,
  StatusResult,
} from "@/lib/api/types";

export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
};

/** GET /appointments – Quản lý thấy lịch của mọi khách; sắp theo thời điểm tạo, cũ trước (FR-ASG-01). */
export async function listAppointments(params: AppointmentListParams = {}) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

/**
 * GET /appointments/{id}/suggestions – với lịch lưu trú Chờ xác nhận trả chuồng đề xuất (FR-HTL-05).
 * Cùng đường dẫn với đề xuất nhân viên spa (thẻ 144) nhưng khác kiểu trả về nên tách hàm theo loại lịch.
 * Lịch không còn Chờ xác nhận → 409 INVALID_TRANSITION; không tìm thấy → 404 NOT_FOUND.
 */
export async function getHotelSuggestions(appointmentId: string) {
  const { data } = await apiClient.get<HotelSuggestions>(`/appointments/${appointmentId}/suggestions`);
  return data;
}

/**
 * POST /appointments/{id}/confirm – xác nhận lịch lưu trú kèm chuồng (FR-HTL-05). Chỉ gửi `cageId`.
 * Chuồng trùng đêm, sai loài hoặc sai nhóm → 409 CAGE_CONFLICT; lịch không còn Chờ xác nhận → 409 INVALID_TRANSITION.
 */
export async function confirmHotelAppointment({
  appointmentId,
  cageId,
}: { appointmentId: string } & ConfirmHotelRequest) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${appointmentId}/confirm`, {
    cageId,
  } satisfies ConfirmHotelRequest);
  return data;
}

/**
 * POST /appointments/{id}/reject – từ chối lịch Chờ xác nhận khi cửa hàng không thể đáp ứng (FR-HTL-06, FR-ASG-04).
 * Không có body; lịch chuyển Đã hủy với lý do StoreUnable. Lịch không còn Chờ xác nhận → 409 INVALID_TRANSITION.
 */
export async function rejectAppointment(appointmentId: string) {
  const { data } = await apiClient.post<RejectResult>(`/appointments/${appointmentId}/reject`);
  return data;
}

/** GET /appointments/{id} – chi tiết lịch hẹn; lịch spa kèm `services` (tên dịch vụ) để MW-04 nêu dịch vụ và tính tạm tính. */
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

/**
 * GET /appointments/{id}/suggestions – với lịch spa Chờ xác nhận trả nhân viên đề xuất và nhân viên thay thế (FR-ASG-01).
 * Lịch không còn Chờ xác nhận → 409 INVALID_TRANSITION; không tìm thấy → 404 NOT_FOUND.
 */
export async function getSpaSuggestions(appointmentId: string) {
  const { data } = await apiClient.get<SpaSuggestions>(`/appointments/${appointmentId}/suggestions`);
  return data;
}

/**
 * POST /appointments/{id}/confirm – xác nhận lịch spa kèm nhân viên phụ trách (FR-ASG-02, FR-ASG-03). Chỉ gửi `staffIds`
 * (và `confirmOutOfShift: true` khi Quản lý đã đồng ý chọn người ngoài ca); không gửi trạng thái hay số tiền.
 * Sai số nhân viên → 409 STAFF_COUNT_MISMATCH; trùng khung giờ → 409 STAFF_CONFLICT; ngoài ca mà chưa đồng ý → 409 STAFF_OUT_OF_SHIFT;
 * không phải nhân viên spa đang hoạt động → 400 VALIDATION_ERROR; lịch không còn Chờ xác nhận → 409 INVALID_TRANSITION.
 */
export async function confirmSpaAppointment({
  appointmentId,
  staffIds,
  confirmOutOfShift,
}: { appointmentId: string } & ConfirmSpaRequest) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${appointmentId}/confirm`, {
    staffIds,
    ...(confirmOutOfShift ? { confirmOutOfShift } : {}),
  } satisfies ConfirmSpaRequest);
  return data;
}
