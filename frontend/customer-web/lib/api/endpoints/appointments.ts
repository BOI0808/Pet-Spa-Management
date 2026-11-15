import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  Payment,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
  StatusResult,
  UpdateAppointmentRequest,
} from "@/lib/api/types";

export type SpaSlotParams = { date: string; petId: string; serviceIds: string[] };

/** GET /spa/slots – FR-BOOK-02. `serviceIds` phân cách bằng dấu phẩy, không lặp tham số. */
export async function getSpaSlots({ date, petId, serviceIds }: SpaSlotParams) {
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

/** POST /appointments/spa – FR-BOOK-03. Backend tính tiền, thời lượng, số nhân viên và giữ chỗ (BR-18). */
export async function createSpaAppointment(body: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", body);
  return data;
}

export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  date?: string;
  petId?: string;
  page?: number;
  pageSize?: number;
};

/** GET /appointments – FR-BOOK-04, FR-BOOK-05. Backend chỉ trả lịch của khách đang đăng nhập (BR-16). */
export async function listAppointments(params: AppointmentListParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

/** GET /appointments/{id} – FR-BOOK-04. Lịch của khách khác → 403, không trả thông tin (BR-16). */
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

/** GET /appointments/{id}/payments – FR-PAY-04. Spa có 1 khoản; lưu trú tối đa 2 khoản (Stay, LateFee). */
export async function listAppointmentPayments(appointmentId: string) {
  const { data } = await apiClient.get<Payment[]>(`/appointments/${encodeURIComponent(appointmentId)}/payments`);
  return data;
}

/**
 * PUT /appointments/{id} – FR-CHG-01. Khách đổi trong hạn: lịch về Chờ xác nhận, phân công/chuồng bị bỏ (BR-26).
 * 409 `CHANGE_WINDOW_CLOSED` khi quá hạn tự đổi (FR-CHG-02), `SLOT_FULL` / `NO_CAPACITY` khi hết chỗ.
 */
export async function updateAppointment(appointmentId: string, body: UpdateAppointmentRequest) {
  const { data } = await apiClient.put<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}`, body);
  return data;
}

/**
 * POST /appointments/{id}/cancel – FR-CHG-01. Khách không gửi body, backend đặt lý do `CustomerCancelled`.
 * 409 `CHANGE_WINDOW_CLOSED` khi quá hạn tự hủy (FR-CHG-02).
 */
export async function cancelAppointment(appointmentId: string) {
  const { data } = await apiClient.post<StatusResult>(`/appointments/${encodeURIComponent(appointmentId)}/cancel`);
  return data;
}
