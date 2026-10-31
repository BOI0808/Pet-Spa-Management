import { apiClient } from "@/lib/api/client";
import type { Me, UpdateMeRequest } from "@/lib/api/types";

/** GET /me – tài khoản lấy từ token, không gửi id (BR-16). */
export async function getMe() {
  const { data } = await apiClient.get<Me>("/me");
  return data;
}

/** PUT /me – FR-ACC-03. Đổi số điện thoại thì backend đổi luôn tên đăng nhập. */
export async function updateMe(body: UpdateMeRequest) {
  await apiClient.put("/me", body);
}
