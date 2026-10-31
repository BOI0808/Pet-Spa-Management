import { apiClient } from "@/lib/api/client";
import type { RegisterRequest, RegisterResponse } from "@/lib/api/types";

/** POST /auth/register – FR-ACC-01. Không gửi role: backend luôn đặt Customer. */
export async function register(body: RegisterRequest) {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", body, { skipAuthRefresh: true });
  return data;
}
