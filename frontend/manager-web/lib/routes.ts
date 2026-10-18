//Đường dẫn các màn hình Web quản lý
export const ROUTES = {
  monitoring: "/", //Giám sát lịch hẹn
  services: "/dich-vu", //Danh mục dịch vụ
  cages: "/chuong-va-gia", //Chuồng và giá lưu trú
  staff: "/nhan-vien", //Nhân viên
  spaAppointments: "/lich-spa", //Lịch hẹn Spa
  hotelAppointments: "/lich-luu-tru", //Lịch hẹn Lưu trú
  cageStatus: "/tinh-trang-chuong", //Tình trạng chuồng
  bookingLocks: "/go-khoa-dat-lich", //Gỡ khóa đặt lịch
  payments: "/thanh-toan", //Thanh toán
} as const;