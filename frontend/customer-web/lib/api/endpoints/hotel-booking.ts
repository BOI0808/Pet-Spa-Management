import { apiClient } from "@/lib/api/client";
import type { HotelAvailability, HotelBookingCreated, HotelBookingRequest } from "@/lib/api/types";

/** `from`, `to`: ISO 8601 có `+07:00` (lib/time.ts). */
export type HotelAvailabilityParams = { from: string; to: string; petId: string };

/** GET /hotel/availability – FR-HTL-04. Backend tính số đêm theo ngày ở múi giờ cửa hàng và tiền tạm tính (BR-21, BR-22). */
export async function getHotelAvailability(params: HotelAvailabilityParams) {
  const { data } = await apiClient.get<HotelAvailability>("/hotel/availability", { params });
  return data;
}

/** POST /appointments/hotel – FR-HTL-04. Không gửi chuồng, giá, `status`; backend giữ chỗ trong giao dịch có khóa (BR-18). */
export async function createHotelAppointment(body: HotelBookingRequest) {
  const { data } = await apiClient.post<HotelBookingCreated>("/appointments/hotel", body);
  return data;
}
