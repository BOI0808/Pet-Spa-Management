import { apiClient } from "@/lib/api/client";
import type { Service } from "@/lib/api/types";

/** GET /services – FR-SVC-04: khách hàng chỉ nhận dịch vụ đang cung cấp. */
export async function listServices() {
  const { data } = await apiClient.get<Service[]>("/services");
  return data;
}
