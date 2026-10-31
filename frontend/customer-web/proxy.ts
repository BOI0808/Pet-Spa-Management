import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/session-config";
import { getSafeNextPath, PUBLIC_PATHS, ROUTES } from "@/lib/routes";

// Lớp 1 chặn truy cập – kiểm tra lạc quan (Frontend-Architecture 4.2, 6.4): chỉ xem có cookie phiên hay không,
// không giải mã token, không gọi backend. SessionGate kiểm tra lại ở trình duyệt; quyền thật do backend quyết định.
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_TOKEN_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!isPublic && !hasSession) {
    const url = new URL(ROUTES.login, request.url);
    if (pathname !== ROUTES.home) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (isPublic && hasSession) {
    // Đã đăng nhập mà mở màn đăng nhập/đăng ký: về trang đích (User-Flows 4.1).
    const next = getSafeNextPath(searchParams.get("next")) ?? ROUTES.home;
    return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua route handler, tệp build, tối ưu ảnh và tệp tĩnh có phần mở rộng (icon.svg…).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
