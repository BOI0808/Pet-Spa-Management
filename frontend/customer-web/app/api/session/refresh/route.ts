import type { NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/session-config";
import {
  backendUnavailableResponse,
  callBackend,
  clearRefreshCookie,
  forbiddenResponse,
  isSameOrigin,
  jsonNoStore,
  readTokenPair,
  relayError,
  setRefreshCookie,
  unauthenticatedResponse,
} from "@/lib/auth/session-server";

// POST /api/session/refresh (Frontend-Architecture 6.2): đọc cookie → POST /auth/refresh (xoay vòng)
// → ghi đè cookie bằng refresh token mới, trả { accessToken }.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return forbiddenResponse();

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return unauthenticatedResponse();

  const refreshed = await callBackend(request, "/auth/refresh", { body: { refreshToken } });
  // Mất kết nối, 5xx, 429: giữ cookie vì phiên có thể vẫn còn.
  if (!refreshed) return backendUnavailableResponse();
  if (refreshed.status === 400 || refreshed.status === 401) {
    // Token đã thu hồi, hết hạn hoặc tài khoản bị vô hiệu hóa: xóa cookie để proxy.ts không coi là còn phiên.
    const response = await relayError(refreshed);
    clearRefreshCookie(response, request);
    return response;
  }
  if (!refreshed.ok) return relayError(refreshed);

  const tokens = await readTokenPair(refreshed);
  if (!tokens) return backendUnavailableResponse();

  const response = jsonNoStore({ accessToken: tokens.accessToken });
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}
