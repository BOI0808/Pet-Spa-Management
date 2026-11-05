import { apiClient } from "@/lib/api/client";
import type { LoginRequest, SessionLoginResponse, SessionRefreshResponse } from "@/lib/api/types";

// Ba route handler `app/api/session/*` của chính web này (cùng origin, không phải backend):
// `baseURL: ""` để Axios gọi đường dẫn tương đối thay vì NEXT_PUBLIC_API_BASE_URL.
const SAME_ORIGIN = { baseURL: "" };

export async function loginSession(body: LoginRequest) {
  const { data } = await apiClient.post<SessionLoginResponse>("/api/session/login", body, SAME_ORIGIN);
  return data;
}

export async function refreshSession() {
  const { data } = await apiClient.post<SessionRefreshResponse>("/api/session/refresh", undefined, SAME_ORIGIN);
  return data;
}

export async function logoutSession() {
  await apiClient.post("/api/session/logout", undefined, SAME_ORIGIN);
}
