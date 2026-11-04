import { apiClient } from "@/lib/api/client";
import type { HotelPricing } from "@/lib/api/types";

/** GET /hotel/pricing – FR-HTL-03. Chưa thiết lập thì `pricing` rỗng và `lateFeePerBlock` bằng 0. */
export async function getHotelPricing() {
  const { data } = await apiClient.get<HotelPricing>("/hotel/pricing");
  return data;
}
