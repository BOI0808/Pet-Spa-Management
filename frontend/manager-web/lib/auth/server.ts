// Chỉ dùng trong route handler `app/api/session/*` (chạy trên server của Next.js).
import { NextResponse, type NextRequest } from "next/server";
import { isErrorEnvelope, type ErrorEnvelope } from "@/lib/api/errors";
import type { Me, TokenPair } from "@/lib/api/types";
import { REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE } from "./config";

export const BACKEND_UNREACHABLE: ErrorEnvelope = {
  status: 502,
  title: "Không kết nối được máy chủ",
};

/** Yêu cầu từ trang khác origin hoặc body sai dạng. */
export const INVALID_REQUEST: ErrorEnvelope = {
  status: 400,
  code: "VALIDATION_ERROR",
  title: "Yêu cầu không hợp lệ",
};

function isTokenPair(data: unknown): data is TokenPair {
  return (
    typeof data === "object" &&
    data !== null &&
    "accessToken" in data &&
    typeof data.accessToken === "string" &&
    "refreshToken" in data &&
    typeof data.refreshToken === "string"
  );
}

function isMe(data: unknown): data is Me {
  return (
    typeof data === "object" &&
    data !== null &&
    "userId" in data &&
    typeof data.userId === "string" &&
    "userName" in data &&
    typeof data.userName === "string" &&
    "role" in data &&
    typeof data.role === "string"
  );
}

/** Route handler là nơi duy nhất gọi backend bằng `fetch` (FA 6.2, 7.1); server → server nên không cần CORS. */
export async function callBackend(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; accessToken?: string } = {},
) {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    return null; // không kết nối được backend
  }
}

export function errorResponse(envelope: ErrorEnvelope) {
  return NextResponse.json(envelope, { status: envelope.status });
}

/** Chuyển nguyên mã HTTP và error envelope của backend về trình duyệt. */
export async function relayBackendError(response: Response | null) {
  if (!response) return errorResponse(BACKEND_UNREACHABLE);

  const body: unknown = await response.json().catch(() => null);
  return errorResponse(isErrorEnvelope(body) ? body : { status: response.status, title: "Có lỗi xảy ra" });
}

export async function readTokenPair(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return isTokenPair(body) ? body : null;
}

export async function readMe(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return isMe(body) ? body : null;
}

/** Chỉ nhận yêu cầu từ chính web này (FA 6.2). */
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
}

export function setRefreshCookie(response: NextResponse, request: NextRequest, refreshToken: string) {
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:", // http://localhost khi chạy trên máy
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.delete(REFRESH_COOKIE);
}

/**
 * Thu hồi refresh token ở backend. POST /auth/logout cần access token còn hạn: nếu đã hết hạn thì đổi lấy cặp mới
 * rồi thu hồi cặp đó. Lỗi bị bỏ qua để người dùng vẫn thoát được phiên ở web.
 */
export async function revokeRefreshToken(refreshToken: string, accessToken?: string) {
  const logout = (pair: TokenPair) =>
    callBackend("/auth/logout", { accessToken: pair.accessToken, body: { refreshToken: pair.refreshToken } });

  if (accessToken) {
    const response = await logout({ accessToken, refreshToken });
    if (response?.status !== 401) return;
  }

  const refreshed = await callBackend("/auth/refresh", { body: { refreshToken } });
  const pair = refreshed?.ok ? await readTokenPair(refreshed) : null;
  if (pair) await logout(pair);
}
