import { apiClient } from "@/lib/api/client";
import type { AppointmentPage, AppointmentStatus, AppointmentType } from "@/lib/api/types";

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
