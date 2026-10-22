// Đường dẫn các màn hình web quản lý (User-Flows.md mục 2.3; sitemap – System Analysis mục 6.2).
// Lịch spa và lưu trú chung một danh sách MW-03, lọc bằng `?type=Spa|Hotel`; tình trạng chuồng nằm trong MW-07.
export const ROUTES = {
  dashboard: "/", // MW-02 Tổng quan & giám sát tiến độ
  appointments: "/lich-hen", // MW-03 Danh sách lịch hẹn
  appointmentDetail: (appointmentId: string) => `/lich-hen/${appointmentId}`, // MW-05 Chi tiết lịch hẹn
  pending: "/cho-xac-nhan", // MW-04 Xử lý lịch hẹn chờ xác nhận
  services: "/dich-vu", // MW-06 Danh mục dịch vụ
  cages: "/chuong-va-gia", // MW-07 Chuồng & giá lưu trú
  staff: "/nhan-vien", // MW-08 Nhân viên
  workShifts: "/lich-lam-viec", // MW-12 Lịch làm việc nhân viên spa
  lockedCustomers: "/go-khoa-dat-lich", // MW-09 Khách hàng bị khóa
  payments: "/thanh-toan", // MW-10 Thanh toán
  config: "/cau-hinh", // MW-13 Cấu hình hệ thống
  profile: "/ho-so", // MW-11 Hồ sơ cá nhân
  login: "/dang-nhap", // MW-01 Đăng nhập
} as const;
