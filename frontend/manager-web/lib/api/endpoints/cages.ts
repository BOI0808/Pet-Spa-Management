import { apiClient } from "@/lib/api/client";
import type {
  ActiveToggleRequest,
  Cage,
  CageCreated,
  CageCreateRequest,
  CageUpdateRequest,
  Page,
} from "@/lib/api/types";

// MW-07 lấy một trang 100 chuồng; cửa hàng không có nhiều hơn (số chuồng là sức chứa lưu trú).
const CAGE_PAGE_SIZE = 100;

/** GET /cages – FR-HTL-08. Gồm cả chuồng đã ngừng sử dụng; `occupant` là thú cưng đang lưu trú (lịch `InStay`), sắp theo mã chuồng. */
export async function listCages() {
  const { data } = await apiClient.get<Page<Cage>>("/cages", { params: { page: 1, pageSize: CAGE_PAGE_SIZE } });
  return data;
}

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
