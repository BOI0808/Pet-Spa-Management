import type { NextRequest } from "next/server";
import { ALLOWED_ROLE, SESSION_MESSAGES } from "@/lib/auth/session-config";
import {
  backendUnavailableResponse,
  callBackend,
  errorResponse,
  forbiddenResponse,
  isSameOrigin,
  jsonNoStore,
  readMe,
  readTokenPair,
  relayError,
  revokeRefreshToken,
  setRefreshCookie,
} from "@/lib/auth/session-server";

// POST /api/session/login { userName, password } (Frontend-Architecture 6.2):
// POST /auth/login → GET /me để biết vai trò → đúng web thì đặt cookie refresh token, trả { accessToken, me }.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return forbiddenResponse();

  const body: unknown = await request.json().catch(() => null);
  const userName = typeof body === "object" && body !== null && "userName" in body ? body.userName : undefined;
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : undefined;
  if (typeof userName !== "string" || typeof password !== "string") {
    return errorResponse({
      status: 400,
      code: "VALIDATION_ERROR",
      title: "Dữ liệu không hợp lệ",
      detail: "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.",
    });
  }

  const login = await callBackend(request, "/auth/login", { body: { userName, password } });
  if (!login) return backendUnavailableResponse();
  if (!login.ok) return relayError(login);
  const tokens = await readTokenPair(login);
  if (!tokens) return backendUnavailableResponse();

  const meResponse = await callBackend(request, "/me", { method: "GET", accessToken: tokens.accessToken });
  const me = meResponse?.ok ? await readMe(meResponse) : null;
  if (!me || me.role !== ALLOWED_ROLE) {
    // Không lưu phiên: thu hồi refresh token vừa cấp (User-Flows 4.2, Auth 3.6).
    await revokeRefreshToken(request, tokens.refreshToken, tokens.accessToken);
    if (!me) return backendUnavailableResponse();
    return errorResponse({ status: 403, code: "FORBIDDEN", title: SESSION_MESSAGES.wrongRole });
  }

  const response = jsonNoStore({ accessToken: tokens.accessToken, me });
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}
