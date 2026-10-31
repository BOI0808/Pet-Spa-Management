import { NextResponse, type NextRequest } from "next/server";
import type { LoginRequest, SessionLoginResponse } from "@/lib/api/types";
import { ALLOWED_ROLE } from "@/lib/auth/config";
import {
  BACKEND_UNREACHABLE,
  callBackend,
  errorResponse,
  INVALID_REQUEST,
  isSameOrigin,
  readMe,
  readTokenPair,
  relayBackendError,
  revokeRefreshToken,
  setRefreshCookie,
} from "@/lib/auth/server";

function isLoginRequest(body: unknown): body is LoginRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "userName" in body &&
    typeof body.userName === "string" &&
    "password" in body &&
    typeof body.password === "string"
  );
}

// POST /api/session/login: đăng nhập, kiểm tra vai trò, đặt cookie refresh token (FA 6.2).
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse(INVALID_REQUEST);

  const body: unknown = await request.json().catch(() => null);
  if (!isLoginRequest(body)) return errorResponse(INVALID_REQUEST);

  const loginResponse = await callBackend(request, "/auth/login", { body: { userName: body.userName, password: body.password } });
  if (!loginResponse?.ok) return relayBackendError(loginResponse);

  const tokens = await readTokenPair(loginResponse);
  if (!tokens) return errorResponse(BACKEND_UNREACHABLE);

  const meResponse = await callBackend(request, "/me", { method: "GET", accessToken: tokens.accessToken });
  const me = meResponse?.ok ? await readMe(meResponse) : null;
  if (!me) {
    await revokeRefreshToken(request, tokens.refreshToken, tokens.accessToken);
    return meResponse?.ok ? errorResponse(BACKEND_UNREACHABLE) : relayBackendError(meResponse);
  }

  // Đúng mật khẩu nhưng không phải Quản lý (BR-05, Authorization 3.6): thu hồi token vừa cấp, không đặt cookie.
  if (me.role !== ALLOWED_ROLE) {
    await revokeRefreshToken(request, tokens.refreshToken, tokens.accessToken);
    return errorResponse({ status: 403, code: "FORBIDDEN", title: "Tài khoản không có quyền truy cập web này" });
  }

  const response = NextResponse.json<SessionLoginResponse>({ accessToken: tokens.accessToken, me });
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}
