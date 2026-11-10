import { apiClient } from "@/lib/api/client";
import type { Pet } from "@/lib/api/types";

/** GET /pets/{petId} – Quản lý xem được hồ sơ của mọi khách (FR-PET-02, chỉ xem). */
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${petId}`);
  return data;
}
