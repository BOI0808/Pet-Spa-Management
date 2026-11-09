import { apiClient } from "@/lib/api/client";
import type { Pet, PetPage, PetRequest, PetSizeResult } from "@/lib/api/types";

/** Lễ tân xem thú cưng của một khách bằng `customerId` (backend bắt buộc với lễ tân). */
export type PetListParams = { customerId: string; page?: number; pageSize?: number };

/** GET /pets – chỉ hồ sơ đang hoạt động. */
export async function listPets(params: PetListParams) {
  const { data } = await apiClient.get<PetPage>("/pets", { params });
  return data;
}

/** GET /pets/{id} – lễ tân xem được mọi hồ sơ trong cửa hàng (BR-16). */
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${petId}`);
  return data;
}

/** POST /pets – FR-PET-01; lễ tân gửi kèm `customerId`, backend xác định nhóm kích cỡ (FR-PET-04). */
export async function createPet(body: PetRequest) {
  const { data } = await apiClient.post<PetSizeResult>("/pets", body);
  return data;
}

/** PUT /pets/{id} – FR-PET-02; ghi đè cả hồ sơ, backend xác định lại nhóm kích cỡ. */
export async function updatePet(petId: string, body: PetRequest) {
  const { data } = await apiClient.put<PetSizeResult>(`/pets/${petId}`, body);
  return data;
}
