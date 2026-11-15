import { apiClient } from "@/lib/api/client";
import type { CagePage } from "@/lib/api/types";

export type CageListParams = { page?: number; pageSize?: number };

/** GET /cages – lễ tân xem tình trạng chuồng (FR-HTL-08); SW-02 dùng để đổi `cageId` của lịch lưu trú ra mã chuồng (G-05). */
export async function listCages(params: CageListParams = {}) {
  const { data } = await apiClient.get<CagePage>("/cages", { params });
  return data;
}
