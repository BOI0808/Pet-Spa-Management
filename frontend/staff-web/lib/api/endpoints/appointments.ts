import { apiClient } from "@/lib/api/client";
import type {
  AppointmentDetail,
  AppointmentPage,
  AppointmentStatus,
  AppointmentType,
  CheckInResult,
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

/** Thứ tự của GET /appointments: theo giờ hẹn (`time_*`) hoặc thời điểm tạo (`created_*`). */
export type AppointmentSort = "time_asc" | "time_desc" | "created_desc" | "created_asc";

/** Tham số lọc của GET /appointments. `petId` chỉ áp dụng cho khách nên web nhân viên không gửi. */
export type AppointmentListParams = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  /** “YYYY-MM-DD” theo múi giờ cửa hàng; lịch spa lọc theo giờ bắt đầu (`slotStart`). */
  date?: string;
  sort?: AppointmentSort;
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

/**
 * POST /appointments/{id}/check-in, lịch spa – FR-EXE-02, FR-EXE-10. Backend chuyển lịch sang Đã tiếp nhận rồi đối chiếu
 * cân nặng (BR-23); chỉ hợp lệ trong ngày hẹn và trước khi hết thời gian giữ chỗ, quá hạn → 409 INVALID_TRANSITION.
 */
export async function checkInSpaAppointment({ appointmentId, actualWeightKg }: { appointmentId: string; actualWeightKg: number }) {
  const { data } = await apiClient.post<CheckInResult>(`/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    actualWeightKg,
  });
  return data;
}
