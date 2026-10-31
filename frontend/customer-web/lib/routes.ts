// Đường dẫn các màn hình web khách hàng (sitemap – System Analysis mục 6.2).
export const ROUTES = {
  home: "/", // CW-03 Trang chủ: danh mục dịch vụ & giá lưu trú
  pets: "/thu-cung", // CW-04, CW-05
  spaBooking: "/dat-lich/spa", // CW-06
  hotelBooking: "/dat-lich/luu-tru", // CW-07
  appointments: "/lich-hen", // CW-08, CW-09, CW-10
  history: "/lich-su", // CW-11
  notifications: "/thong-bao", // CW-12
  profile: "/ho-so", // CW-13
  login: "/dang-nhap", // CW-02
  register: "/dang-ky", // CW-01
} as const;

/** Màn không có khung, vào được khi chưa đăng nhập (User-Flows 4.2). */
export const PUBLIC_PATHS: readonly string[] = [ROUTES.login, ROUTES.register];

/**
 * `?next=` chỉ nhận đường dẫn nội bộ: bắt đầu bằng `/`, không bắt đầu bằng `//` hay `/\` (chống chuyển hướng
 * ra ngoài – User-Flows 4.1) và không phải màn đăng nhập/đăng ký. Không hợp lệ thì trả null.
 */
export function getSafeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  const pathname = next.split(/[?#]/, 1)[0];
  return PUBLIC_PATHS.includes(pathname) ? null : next;
}

/** Màn đăng nhập kèm trang cần quay lại sau khi đăng nhập. */
export function loginPath(next?: string | null) {
  const safeNext = getSafeNextPath(next);
  return safeNext && safeNext !== ROUTES.home
    ? `${ROUTES.login}?next=${encodeURIComponent(safeNext)}`
    : ROUTES.login;
}
