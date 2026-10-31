import { apiClient } from "@/lib/api/client";
import type { PetPage } from "@/lib/api/types";

export type PetListParams = { page?: number; pageSize?: number };

/** GET /pets – khách hàng chỉ thấy hồ sơ đang hoạt động của mình. */
export async function listPets(params: PetListParams) {
  const { data } = await apiClient.get<PetPage>("/pets", { params });
  return data;
}
