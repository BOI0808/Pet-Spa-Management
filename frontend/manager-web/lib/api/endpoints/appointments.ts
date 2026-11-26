import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  CancelRequest,
  CheckInResult,
  CheckOutResult,
  ConfirmHotelRequest,
  ConfirmSpaRequest,
  HotelSuggestions,
  Photo,
  RejectResult,
  SpaSuggestions,
  StatusResult,
  UpdateAppointmentRequest,
  WeightCheckResponse,
} from "@/lib/api/types";

export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  /**
   * Ngày hẹn dạng `YYYY-MM-DD` theo múi giờ cửa hàng. Lịch spa: theo giờ bắt đầu; lịch lưu trú: có ngày nhận hoặc ngày trả
   * (dự kiến hoặc thực tế) trong ngày đó.
   */
  date?: string;
  page?: number;
  pageSize?: number;
};

/**
 * GET /appointments – Quản lý thấy lịch của mọi khách (FR-ASG-01, FR-EXE-08). Không truyền `sort` thì backend tự chọn:
 * có `date` hoặc `status` Đã xác nhận/Đã tiếp nhận/Đang thực hiện/Đang lưu trú → giờ hẹn tăng dần; Hoàn tất/Đã hủy → giờ hẹn giảm dần;
 * còn lại → mới tạo trước.
 */
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

/**
 * POST /appointments/{id}/cancel – Quản lý hủy lịch hẹn khi cửa hàng không thể đáp ứng hoặc khi khách yêu cầu ngoài thời hạn tự hủy (FR-CHG-03).
 * Bắt buộc gửi `reason` là StoreUnable hoặc CustomerBeyondDeadline; không gửi trạng thái hay số tiền (hoàn tiền xử lý ngoài hệ thống, BR-24).
 * Lịch Hoàn tất, đã Đã hủy → 409 INVALID_TRANSITION; không tìm thấy → 404 NOT_FOUND.
 */
export async function cancelAppointment({ appointmentId, reason }: { appointmentId: string } & CancelRequest) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
    reason,
  } satisfies CancelRequest);
  return data;
}

/**
 * PUT /appointments/{id} – Quản lý đổi lịch Chờ xác nhận hoặc Đã xác nhận, không giới hạn hạn tự đổi, trạng thái giữ nguyên (FR-CHG-03).
 * Lỗi 409 thường gặp: SLOT_FULL, NO_CAPACITY, STAFF_COUNT_MISMATCH, STAFF_CONFLICT, STAFF_OUT_OF_SHIFT, INVALID_TRANSITION.
 */
export async function updateAppointment({ appointmentId, body }: { appointmentId: string; body: UpdateAppointmentRequest }) {
  const { data } = await apiClient.put<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}`, body);
  return data;
}

/**
 * GET /appointments/{id}/photos – FR-EXE-09. Quản lý xem ảnh của mọi lịch; backend trả URL tạm thời (hạn 1 giờ) cho từng ảnh.
 * Lịch chưa có ảnh trả mảng rỗng.
 */
export async function listAppointmentPhotos(appointmentId: string) {
  const { data } = await apiClient.get<Photo[]>(`/appointments/${encodeURIComponent(appointmentId)}/photos`);
  return data;
}

// ── Cập nhật trực tiếp trạng thái thực hiện (MW-05 vùng 7) – FR-EXE-05, BR-05 ──
// Quản lý gọi được các thao tác dưới đây cùng nhân viên (x-roles có QL). Backend kiểm tra trình tự vòng đời; web không gửi `status`.

/**
 * POST /appointments/{id}/check-in, lịch spa – FR-EXE-02. Backend chuyển lịch sang Đã tiếp nhận rồi đối chiếu cân nặng (BR-23);
 * chỉ hợp lệ trong ngày hẹn và trước khi hết thời gian giữ chỗ (Booking.HoldMinutes), quá hạn → 409 INVALID_TRANSITION.
 */
export async function checkInSpaAppointment({ appointmentId, actualWeightKg }: { appointmentId: string; actualWeightKg: number }) {
  const { data } = await apiClient.post<CheckInResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    actualWeightKg,
  });
  return data;
}

/**
 * POST /appointments/{id}/weight-check, lịch lưu trú – FR-EXE-10, BR-23. Bước 1 của tiếp nhận lưu trú, trước khi thu tiền lưu trú;
 * lịch vẫn ở Đã xác nhận. 409 `COST_CONFIRMATION_PENDING` khi đang chờ khách xác nhận chi phí mới.
 */
export async function weightCheckHotelAppointment({ appointmentId, actualWeightKg }: { appointmentId: string; actualWeightKg: number }) {
  const { data } = await apiClient.post<WeightCheckResponse>(
    `/appointments/${encodeURIComponent(appointmentId)}/weight-check`,
    { actualWeightKg },
  );
  return data;
}

/**
 * POST /appointments/{id}/check-in, lịch lưu trú, không có body – FR-HTL-07. Đã xác nhận → Đang lưu trú khi đã đối chiếu cân nặng,
 * không chờ khách xác nhận chi phí mới, chuồng còn phù hợp và tiền lưu trú đã thanh toán. 409: `INVALID_TRANSITION`,
 * `COST_CONFIRMATION_PENDING`, `CAGE_CONFLICT`, `PAYMENT_NOT_DUE`.
 */
export async function checkInHotelAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-in`);
  return data;
}

/**
 * POST /appointments/{id}/start – FR-EXE-03, FR-EXE-05. Đã tiếp nhận → Đang thực hiện. 409 `PHOTO_REQUIRED` (chưa có ảnh trước
 * hợp lệ, BR-20), `COST_CONFIRMATION_PENDING` (BR-23), `INVALID_TRANSITION` (lịch không còn ở Đã tiếp nhận).
 */
export async function startAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/start`);
  return data;
}

/**
 * POST /appointments/{id}/complete – FR-EXE-04, FR-EXE-05. Đang thực hiện → Hoàn tất, hình thành khoản thanh toán spa. 409
 * `SERVICES_INCOMPLETE` (BR-06), `PHOTO_REQUIRED` (chưa có ảnh sau, BR-20), `INVALID_TRANSITION`.
 */
export async function completeAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/complete`);
  return data;
}

/**
 * POST /appointments/{id}/check-out, lịch lưu trú – FR-HTL-09, BR-22. Đang lưu trú → Hoàn tất, backend ghi giờ trả thực tế và giải
 * phóng chuồng. Có phí trả muộn: lần gọi đầu tạo khoản `LateFee` chưa thanh toán và trả 409 `PAYMENT_NOT_DUE`; sau khi ghi nhận
 * khoản đó ở MW-10 thì gọi lại để hoàn tất (BR-07, UI-Screens G-12).
 */
export async function checkOutHotelAppointment(appointmentId: string) {
  const { data } = await apiClient.post<CheckOutResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-out`);
  return data;
}
