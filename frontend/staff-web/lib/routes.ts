// Đường dẫn các màn hình web nhân viên (sitemap – System Analysis mục 6.2).
// Màn chi tiết (SW-03, SW-05, SW-11) nằm dưới đường dẫn của màn danh sách, tạo ở thẻ làm màn đó.
export const ROUTES = {
  appointments: "/lich-hen", // SW-02 Lịch hẹn, SW-03 Chi tiết, SW-11 Thực hiện dịch vụ (NVS)
  checkIn: "/tiep-nhan", // SW-07 Tiếp nhận & cân nặng (LT)
  checkOut: "/tra-thu-cung", // SW-10 Trả thú cưng lưu trú (LT)
  customers: "/khach-hang", // SW-04 Khách hàng, SW-05 Hồ sơ thú cưng (LT)
  bookForCustomer: "/dat-lich", // SW-06 Đặt lịch thay khách (LT)
  cages: "/chuong", // SW-08 Tình trạng chuồng (LT)
  payments: "/thanh-toan", // SW-09 Thanh toán tại quầy (LT)
  workHistory: "/lich-su-cong-viec", // SW-12 Lịch sử công việc (NVS)
  notifications: "/thong-bao", // SW-13 Thông báo (NVS)
  services: "/dich-vu", // SW-14 Danh mục dịch vụ
  profile: "/ho-so", // SW-15 Hồ sơ cá nhân
  login: "/dang-nhap", // SW-01 Đăng nhập
} as const;
