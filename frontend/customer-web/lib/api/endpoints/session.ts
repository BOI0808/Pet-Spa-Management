import type { AxiosRequestConfig } from "axios";
import { apiClient } from "@/lib/api/client";
import type { LoginRequest, Me } from "@/lib/api/types";

// Route handler phiên của chính web (`app/api/session/*`, Frontend-Architecture 6.2), không có trong openapi.yaml.
// Cùng origin với trang nên bỏ baseURL của backend; refresh token nằm trong cookie httpOnly, trang không đọc được.
const SESSION_REQUEST: AxiosRequestConfig = { baseURL: "", skipAuthRefresh: true };

export type SessionLoginResponse = { accessToken: string; me: Me };
export type SessionRefreshResponse = { accessToken: string };

export async function loginSession(body: LoginRequest) {
  const { data } = await apiClient.post<SessionLoginResponse>("/api/session/login", body, SESSION_REQUEST);
  return data;
}

export async function refreshSession() {
  const { data } = await apiClient.post<SessionRefreshResponse>("/api/session/refresh", undefined, SESSION_REQUEST);
  return data;
}

export async function logoutSession() {
  await apiClient.post("/api/session/logout", undefined, SESSION_REQUEST);
}
