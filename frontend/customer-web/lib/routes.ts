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
