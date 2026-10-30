import { NextResponse, type NextRequest } from "next/server";
import type { SessionRefreshResponse } from "@/lib/api/types";
import { REFRESH_COOKIE } from "@/lib/auth/config";
import {
  BACKEND_UNREACHABLE,
  callBackend,
  clearRefreshCookie,
  errorResponse,
  INVALID_REQUEST,
  isSameOrigin,
  readTokenPair,
  relayBackendError,
  setRefreshCookie,
} from "@/lib/auth/server";

const SESSION_EXPIRED = {
  status: 401,
  code: "UNAUTHENTICATED",
  title: "Chưa xác thực",
  detail: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
};

// POST /api/session/refresh: đổi cookie refresh token lấy access token mới; refresh token xoay vòng nên ghi đè cookie (FA 6.2).
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse(INVALID_REQUEST);

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return errorResponse(SESSION_EXPIRED);

  const refreshResponse = await callBackend("/auth/refresh", { body: { refreshToken } });

  // Backend từ chối token: phiên đã chết, xóa cookie. Lỗi khác (mất kết nối, 5xx) giữ cookie để thử lại.
  if (refreshResponse && (refreshResponse.status === 401 || refreshResponse.status === 400)) {
    const response = errorResponse(SESSION_EXPIRED);
    clearRefreshCookie(response);
    return response;
  }
  if (!refreshResponse?.ok) return relayBackendError(refreshResponse);

  const tokens = await readTokenPair(refreshResponse);
  if (!tokens) return errorResponse(BACKEND_UNREACHABLE);

  const response = NextResponse.json<SessionRefreshResponse>({ accessToken: tokens.accessToken });
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}
