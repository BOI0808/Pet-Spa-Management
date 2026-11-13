import { apiClient } from "@/lib/api/client";
import type { SpaBookingCreated, SpaBookingRequest, SpaSlots } from "@/lib/api/types";

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
