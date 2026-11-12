import { apiClient } from "@/lib/api/client";
import type {
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  ConfirmHotelRequest,
  HotelSuggestions,
  RejectResult,
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
