import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/session-config";
import { clearRefreshCookie, forbiddenResponse, isSameOrigin, revokeRefreshToken } from "@/lib/auth/session-server";

// POST /api/session/logout (Frontend-Architecture 6.2): thu hồi refresh token ở backend (bỏ qua lỗi), xóa cookie, trả 204.
// Trình duyệt gửi kèm access token trong bộ nhớ vì POST /auth/logout của backend cần đăng nhập.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return forbiddenResponse();

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    await revokeRefreshToken(request, refreshToken, accessToken);
  }

  const response = new NextResponse(null, { status: 204 });
  clearRefreshCookie(response, request);
  return response;
}
