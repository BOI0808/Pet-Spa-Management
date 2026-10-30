import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/config";
import { clearRefreshCookie, errorResponse, INVALID_REQUEST, isSameOrigin, revokeRefreshToken } from "@/lib/auth/server";

// POST /api/session/logout: thu hồi refresh token ở backend rồi xóa cookie (FA 6.2). Access token do trình duyệt gửi kèm.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse(INVALID_REQUEST);

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer /, "");
    await revokeRefreshToken(refreshToken, accessToken);
  }

  const response = new NextResponse(null, { status: 204 });
  clearRefreshCookie(response);
  return response;
}
