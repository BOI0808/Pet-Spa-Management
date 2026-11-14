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
} from "@/lib/api/types";

export type SpaSlotParams = { date: string; petId: string; serviceIds: string[] };

/** GET /spa/slots – FR-BOOK-02. `serviceIds` phân cách bằng dấu phẩy, không lặp tham số. */
export async function getSpaSlots({ date, petId, serviceIds }: SpaSlotParams) {
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

/**
 * POST /appointments/spa – FR-BOOK-03. Lễ tân đặt thay gửi kèm `customerId` và không bị khóa tự đặt lịch (BR-15).
 * Backend tính tiền, thời lượng, số nhân viên và giữ chỗ (BR-18).
 */
export async function createSpaAppointment(body: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", body);
  return data;
}

/**
 * Tham số lọc của GET /appointments. Không có `date`: openapi có ghi nhưng backend (AppointmentsController) chưa nhận,
 * và danh sách sắp theo thời điểm tạo, nên web tự lọc, sắp theo giờ hẹn (UI-Screens G-06). `petId` chỉ áp dụng cho khách.
 */
export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
};

/** GET /appointments – FR-EXE-01. Backend lọc theo vai trò: lễ tân toàn cửa hàng, nhân viên spa lịch được phân công (BR-16). */
export async function listAppointments(params: AppointmentListParams) {
  const { data } = await apiClient.get<AppointmentPage>("/appointments", { params });
  return data;
}

/** GET /appointments/{id} – nhân viên spa mở lịch không được phân công → 403, không trả thông tin (BR-16). */
export async function getAppointment(appointmentId: string) {
  const { data } = await apiClient.get<AppointmentDetail>(`/appointments/${encodeURIComponent(appointmentId)}`);
  return data;
}

/** GET /appointments/{id}/payments – FR-PAY-04. Spa có 1 khoản; lưu trú tối đa 2 khoản (Stay, LateFee). */
export async function listAppointmentPayments(appointmentId: string) {
  const { data } = await apiClient.get<Payment[]>(`/appointments/${encodeURIComponent(appointmentId)}/payments`);
  return data;
}
