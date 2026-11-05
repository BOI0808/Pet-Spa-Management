import { apiClient } from "@/lib/api/client";
import type { Service, SizeGroup, Species } from "@/lib/api/types";

export type ServiceListParams = { species?: Species; sizeGroup?: SizeGroup };

/** GET /services – FR-SVC-04: khách hàng chỉ nhận dịch vụ đang cung cấp; `species`, `sizeGroup` lọc `pricing`. */
export async function listServices(params: ServiceListParams = {}) {
  const { data } = await apiClient.get<Service[]>("/services", { params });
  return data;
}
