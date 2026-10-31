// Chỉ dùng trong route handler `app/api/session/*` (chạy ở server của Next.js), không import từ màn hình.
import { NextResponse, type NextRequest } from "next/server";
import type { ErrorEnvelope } from "@/lib/api/errors";
import type { Me, TokenPair } from "@/lib/api/types";
import { REFRESH_TOKEN_COOKIE } from "./session-config";

/** Bằng thời hạn refresh token ở backend (Jwt__RefreshTokenDays = 7). */
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

const NO_STORE = { "Cache-Control": "no-store" };

export function errorResponse(envelope: ErrorEnvelope) {
  return NextResponse.json(envelope, {
    status: envelope.status,
    headers: { ...NO_STORE, "Content-Type": "application/problem+json" },
  });
}

/** Route handler chỉ nhận yêu cầu từ chính trang của web (Frontend-Architecture 6.2). */
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && URL.canParse(origin) && new URL(origin).host === request.headers.get("host");
}

export const forbiddenResponse = () =>
  errorResponse({
    status: 403,
    code: "FORBIDDEN",
    title: "Không có quyền truy cập",
    detail: "Yêu cầu không đến từ trang của web khách hàng.",
  });

export const unauthenticatedResponse = () =>
  errorResponse({
    status: 401,
    code: "UNAUTHENTICATED",
    title: "Chưa xác thực",
    detail: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  });

/** Không gọi được backend (sai địa chỉ, backend đang khởi động…): không lộ chi tiết (SA 6.6). */
export const backendUnavailableResponse = () =>
  errorResponse({ status: 502, title: "Lỗi hệ thống", detail: "Có lỗi xảy ra, vui lòng thử lại sau." });

type BackendCall = { method?: "GET" | "POST"; body?: unknown; accessToken?: string };

/**
 * Gọi backend bằng fetch ở server: ngoại lệ duy nhất không qua apiClient (Frontend-Architecture 7.1).
 * Chuyển tiếp X-Forwarded-For để giới hạn số lần thử đăng nhập của backend vẫn tính theo IP người dùng.
 * Trả null khi không kết nối được backend.
 */
export async function callBackend(request: NextRequest, path: string, { method = "POST", body, accessToken }: BackendCall) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/** Trả nguyên mã HTTP và error envelope của backend cho trình duyệt. */
export async function relayError(response: Response) {
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { ...NO_STORE, "Content-Type": response.headers.get("Content-Type") ?? "application/problem+json" },
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readTokenPair(response: Response): Promise<TokenPair | null> {
  const data = await readJson(response);
  if (!isRecord(data) || typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") return null;
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function readMe(response: Response): Promise<Me | null> {
  const data = await readJson(response);
  if (!isRecord(data) || typeof data.userId !== "string" || typeof data.userName !== "string") return null;
  if (data.role !== "Customer" && data.role !== "Staff" && data.role !== "Manager") return null;
  return {
    userId: data.userId,
    userName: data.userName,
    role: data.role,
    staffRole: data.staffRole === "Receptionist" || data.staffRole === "SpaStaff" ? data.staffRole : null,
    fullName: typeof data.fullName === "string" ? data.fullName : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    email: typeof data.email === "string" ? data.email : null,
  };
}

/** Thu hồi refresh token ở backend; bỏ qua lỗi vì phiên ở web vẫn bị xóa. */
export async function revokeRefreshToken(request: NextRequest, refreshToken: string, accessToken?: string | null) {
  // POST /auth/logout cần access token còn hạn; hết hạn thì làm mới trước rồi thu hồi cặp token mới.
  let tokens: TokenPair | null = accessToken ? { accessToken, refreshToken } : null;
  if (tokens) {
    const logout = await callBackend(request, "/auth/logout", { body: { refreshToken }, accessToken: tokens.accessToken });
    if (logout?.ok) return;
  }
  const refreshed = await callBackend(request, "/auth/refresh", { body: { refreshToken } });
  tokens = refreshed?.ok ? await readTokenPair(refreshed) : null;
  if (tokens) {
    await callBackend(request, "/auth/logout", { body: { refreshToken: tokens.refreshToken }, accessToken: tokens.accessToken });
  }
}

/**
 * Cookie `ps_rt` (Frontend-Architecture 6.2): HttpOnly; Secure trừ khi chạy http://localhost;
 * SameSite=Lax để còn phiên khi cổng thanh toán chuyển về (UF-11); Path=/ để proxy.ts đọc được.
 */
function refreshCookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setRefreshCookie(response: NextResponse, request: NextRequest, refreshToken: string) {
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions(request, REFRESH_TOKEN_MAX_AGE));
}

export function clearRefreshCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", refreshCookieOptions(request, 0));
}

export function jsonNoStore(body: unknown) {
  return NextResponse.json(body, { headers: NO_STORE });
}
