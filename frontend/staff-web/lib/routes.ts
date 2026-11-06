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

// Đường dẫn có tham số (User-Flows 2.2). Để riêng khỏi ROUTES vì `ROUTE_ROLES` khai báo vai trò theo từng khóa của ROUTES;
// các đường dẫn con dưới `/khach-hang` tự theo vai trò của SW-04 (lễ tân) nhờ `canAccessPath` so tiền tố.
export const customerSearchRoute = (search: string) =>
  search ? `${ROUTES.customers}?search=${encodeURIComponent(search)}` : ROUTES.customers;
export const petCreateRoute = (customerId: string) => `${ROUTES.customers}/${customerId}/thu-cung/them`;
export const petEditRoute = (customerId: string, petId: string) => `${ROUTES.customers}/${customerId}/thu-cung/${petId}`;
