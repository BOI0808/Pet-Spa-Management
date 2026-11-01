import { apiClient } from "@/lib/api/client";
import type { Pet, PetPage, PetRequest, PetSizeResult } from "@/lib/api/types";

export type PetListParams = { page?: number; pageSize?: number };

/** GET /pets – khách hàng chỉ thấy hồ sơ đang hoạt động của mình. */
export async function listPets(params: PetListParams) {
  const { data } = await apiClient.get<PetPage>("/pets", { params });
  return data;
}

/** GET /pets/{id} – backend kiểm tra quyền sở hữu (BR-16). */
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${petId}`);
  return data;
}

/** POST /pets – FR-PET-01; backend xác định nhóm kích cỡ (FR-PET-04). */
export async function createPet(body: PetRequest) {
  const { data } = await apiClient.post<PetSizeResult>("/pets", body);
  return data;
}

/** PUT /pets/{id} – FR-PET-02; ghi đè cả hồ sơ, backend xác định lại nhóm kích cỡ. */
export async function updatePet(petId: string, body: PetRequest) {
  const { data } = await apiClient.put<PetSizeResult>(`/pets/${petId}`, body);
  return data;
}

/** DELETE /pets/{id} – FR-PET-03: chưa từng có lịch hẹn thì xóa hẳn, đã có thì ngừng hoạt động (BR-25). */
export async function deletePet(petId: string) {
  await apiClient.delete(`/pets/${petId}`);
}
