import { apiClient } from "@/lib/api/client";
import type {
  DeactivateResult,
  StaffCreated,
  StaffCreateRequest,
  StaffPage,
  StaffUpdateRequest,
} from "@/lib/api/types";

// MW-08 lấy một trang 100 nhân viên (UI-Screens MW-08); một cửa hàng spa không có nhiều hơn.
const STAFF_PAGE_SIZE = 100;

/** GET /staff – gồm cả nhân viên đã vô hiệu hóa (FR-STF-02). */
export async function listStaff() {
  const { data } = await apiClient.get<StaffPage>("/staff", { params: { page: 1, pageSize: STAFF_PAGE_SIZE } });
  return data;
}

/** POST /staff – FR-STF-01. */
export async function createStaff(body: StaffCreateRequest) {
  const { data } = await apiClient.post<StaffCreated>("/staff", body);
  return data;
}

/** PUT /staff/{id} – FR-STF-02. */
export async function updateStaff({ staffId, body }: { staffId: string; body: StaffUpdateRequest }) {
  await apiClient.put(`/staff/${staffId}`, body);
}

/** POST /staff/{id}/deactivate – FR-STF-03, BR-27. */
export async function deactivateStaff(staffId: string) {
  const { data } = await apiClient.post<DeactivateResult>(`/staff/${staffId}/deactivate`);
  return data;
}
