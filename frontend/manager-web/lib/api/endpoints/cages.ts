import { apiClient } from "@/lib/api/client";
import type { ActiveToggleRequest, CageCreated, CageCreateRequest, CageUpdateRequest } from "@/lib/api/types";

// Chưa có hàm đọc danh sách: GET /cages (FR-HTL-08) do thẻ 88 làm ở backend và thẻ 150 nối ở web.

/** POST /cages – FR-HTL-01. Chuồng mới ở trạng thái đang sử dụng; trùng mã → 409 DUPLICATE_CAGE_CODE. */
export async function createCage(body: CageCreateRequest) {
  const { data } = await apiClient.post<CageCreated>("/cages", body);
  return data;
}

/** PUT /cages/{id} – FR-HTL-02. Trùng mã với chuồng khác → 409 DUPLICATE_CAGE_CODE. */
export async function updateCage({ cageId, body }: { cageId: string; body: CageUpdateRequest }) {
  await apiClient.put(`/cages/${cageId}`, body);
}

/** PATCH /cages/{id}/status – FR-HTL-02: `isActive = false` là ngừng sử dụng, `true` là mở lại. */
export async function setCageStatus({ cageId, isActive }: { cageId: string } & ActiveToggleRequest) {
  await apiClient.patch(`/cages/${cageId}/status`, { isActive } satisfies ActiveToggleRequest);
}
