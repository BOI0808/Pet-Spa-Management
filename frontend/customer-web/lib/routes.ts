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

// Gốc giả chỉ dùng để chuẩn hóa `next`, không bao giờ được truy cập.
const NEXT_BASE = "http://next.invalid";

/**
 * `?next=` chỉ nhận đường dẫn nội bộ (chống chuyển hướng ra ngoài – User-Flows 4.1), không phải màn đăng nhập/đăng ký.
 * Chuẩn hóa bằng URL rồi mới kiểm tra, vì URL bỏ tab/xuống dòng và đổi `\` thành `/`: “/\t/evil.example” thành
 * “//evil.example”. Trả đường dẫn đã chuẩn hóa, không hợp lệ thì trả null.
 */
export function getSafeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(next, NEXT_BASE);
  } catch {
    return null;
  }
  const path = `${url.pathname}${url.search}${url.hash}`;
  // Vẫn phải cùng origin và không bắt đầu bằng “//” sau chuẩn hóa (vd. “/.//evil.example” cho pathname “//evil.example”).
  if (url.origin !== NEXT_BASE || path.startsWith("//") || PUBLIC_PATHS.includes(url.pathname)) return null;
  return path;
}

/** Màn đăng nhập kèm trang cần quay lại sau khi đăng nhập. */
export function loginPath(next?: string | null) {
  const safeNext = getSafeNextPath(next);
  return safeNext && safeNext !== ROUTES.home
    ? `${ROUTES.login}?next=${encodeURIComponent(safeNext)}`
    : ROUTES.login;
}
