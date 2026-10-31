import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/config";
import { buildLoginUrl, getSafeNext } from "@/lib/auth/login-url";
import { ROUTES } from "@/lib/routes";

// Kiểm tra lạc quan (FA 6.4, User-Flows 4.2): chỉ xem có cookie phiên hay không, không giải mã token, không gọi backend.
// Kiểm tra thật nằm ở backend (từng endpoint) và ở SessionGate (vai trò).
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (pathname === ROUTES.login) {
    if (!hasSession) return NextResponse.next();
    // Đã đăng nhập mà mở lại màn đăng nhập: về trang đích (User-Flows 4.1).
    const target = new URL(getSafeNext(searchParams.get("next")) ?? ROUTES.dashboard, request.url);
    if (target.origin !== request.nextUrl.origin) {
      return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
    }
    return NextResponse.redirect(target);
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL(buildLoginUrl({ next: pathname + search }), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua route handler, tệp tĩnh của Next.js và tệp có đuôi (favicon.ico…).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
