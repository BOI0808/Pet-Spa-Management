# Wireframes – Hệ thống quản lý spa thú cưng

Ảnh bố cục từng màn hình (tài liệu #10), chụp từ **UI demo** `frontend/docs/SE358_PetSpa_UI_Demo.html` (bản giao diện nhóm đã chốt) ở bề rộng 1440px. Ảnh cho biết **bố cục**; hành vi, dữ liệu, API, trạng thái của từng vùng mô tả trong `../UI-Screens.md` cùng mã màn.

## Cách đọc

- **Tên file:** `<mã màn>-<tên không dấu>[-<trạng thái>].png`; hộp thoại: `<mã màn>-d<n>-<tên>.png` (khớp mã `CW-09·D3`… ở `../User-Flows.md` mục 2.4).
- **Khung nét đứt màu hồng + số 1, 2, …**: vùng của màn, khớp cột “#” trong bảng “Vùng” của màn đó ở UI-Screens. Cùng một số trên nhiều ảnh của một màn là cùng một vùng ở trạng thái khác.
- **Chữ A – E**: vùng của khung trang chung (thanh trên / thanh bên), mô tả ở UI-Screens mục 2.1.
- Thanh tối “Demo” và khung “Xem trạng thái” của UI demo đã được ẩn khi chụp; dữ liệu trong ảnh là dữ liệu minh họa (“hôm nay” là thứ ba 06/10/2026).
- Bố cục màn hẹp (980px, 640px, 375px) không chụp riêng; quy tắc co giãn ở `../Design-System.md` mục 6.

## Danh mục ảnh

### Khung trang

| Ảnh | Nội dung |
| --- | --- |
| `CW-khung-chung.png` | Thanh trên web khách hàng, menu “Đặt lịch” đang mở (A – E). |
| `SW-khung-chung-le-tan.png` | Thanh trên web nhân viên, vai trò lễ tân (A, B, D). |
| `SW-khung-chung-nhan-vien-spa.png` | Thanh trên web nhân viên, vai trò nhân viên spa, có chuông thông báo (A – D). |
| `MW-khung-chung.png` | Thanh bên web quản lý, số lịch chờ xác nhận (A – D). |

### Web khách hàng

| Màn | Ảnh (trạng thái) |
| --- | --- |
| CW-01 Đăng ký | `CW-01-dang-ky.png` |
| CW-02 Đăng nhập | `CW-02-dang-nhap.png` (thử quá nhiều lần) |
| CW-03 Trang chủ | `CW-03-trang-chu.png` |
| CW-04 Thú cưng của tôi | `CW-04-thu-cung.png` · `CW-04-thu-cung-rong.png` (rỗng) · `CW-04-d1-go-ho-so.png` |
| CW-05 Tạo / sửa hồ sơ | `CW-05-ho-so-thu-cung.png` (thêm mới, chó) |
| CW-06 Đặt lịch spa | `CW-06-dat-lich-spa-b1.png` · `-b2.png` · `-b3.png` · `CW-06-dat-lich-spa-bi-khoa.png` |
| CW-07 Đặt lịch lưu trú | `CW-07-dat-lich-luu-tru.png` (còn chỗ) |
| CW-08 Lịch hẹn của tôi | `CW-08-lich-hen.png` |
| CW-09 Chi tiết lịch hẹn | `CW-09-chi-tiet-can-xac-nhan.png` · `CW-09-chi-tiet-hoan-tat.png` · `CW-09-chi-tiet-luu-tru.png` · `CW-09-ket-qua-thanh-toan.png` (chưa thành công) · `CW-09-d1-huy-lich.png` · `CW-09-d2-tu-choi-chi-phi.png` · `CW-09-d3-thanh-toan-truc-tuyen.png` |
| CW-10 Đổi lịch hẹn | `CW-10-doi-lich-spa.png` · `CW-10-doi-lich-luu-tru.png` |
| CW-11 Lịch sử dịch vụ | `CW-11-lich-su.png` |
| CW-12 Thông báo | `CW-12-thong-bao.png` |
| CW-13 Hồ sơ cá nhân | `CW-13-ho-so.png` |

### Web nhân viên

| Màn | Ảnh (trạng thái) |
| --- | --- |
| SW-01 Đăng nhập | `SW-01-dang-nhap.png` (sai thông tin) |
| SW-02 Lịch hẹn | `SW-02-lich-hen-le-tan.png` · `SW-02-lich-hen-nhan-vien-spa.png` |
| SW-03 Chi tiết lịch hẹn | `SW-03-chi-tiet-le-tan.png` · `SW-03-chi-tiet-nhan-vien-spa.png` |
| SW-04 Khách hàng | `SW-04-khach-hang-tim-thay.png` · `SW-04-khach-hang-vang-lai.png` |
| SW-05 Hồ sơ thú cưng | `SW-05-ho-so-thu-cung.png` (tạo mới cho khách vãng lai) |
| SW-06 Đặt lịch thay khách | `SW-06-dat-lich-thay-spa.png` · `SW-06-dat-lich-thay-luu-tru.png` |
| SW-07 Tiếp nhận & cân nặng | `SW-07-tiep-nhan-nhap-can.png` · `SW-07-tiep-nhan-cho-xac-nhan.png` · `SW-07-tiep-nhan-luu-tru.png` (chưa thu tiền) · `SW-07-d1-ghi-nhan-phan-hoi.png` |
| SW-08 Tình trạng chuồng | `SW-08-chuong.png` |
| SW-09 Thanh toán tại quầy | `SW-09-thanh-toan-tien-mat.png` · `SW-09-thanh-toan-qr.png` |
| SW-10 Trả thú cưng | `SW-10-tra-thu-cung.png` (đón trễ 75 phút) |
| SW-11 Thực hiện dịch vụ | `SW-11-thuc-hien-chua-du-dieu-kien.png` · `SW-11-thuc-hien-dang-lam.png` |
| SW-12 Lịch sử công việc | `SW-12-lich-su-cong-viec.png` |
| SW-13 Thông báo | `SW-13-thong-bao.png` |
| SW-14 Danh mục dịch vụ | `SW-14-dich-vu.png` |
| SW-15 Hồ sơ cá nhân | `SW-15-ho-so.png` |

### Web quản lý

| Màn | Ảnh (trạng thái) |
| --- | --- |
| MW-01 Đăng nhập | `MW-01-dang-nhap.png` (sai thông tin) |
| MW-02 Tổng quan | `MW-02-tong-quan.png` |
| MW-03 Danh sách lịch hẹn | `MW-03-lich-hen.png` |
| MW-04 Chờ xác nhận | `MW-04-cho-xac-nhan-spa.png` · `MW-04-cho-xac-nhan-phan-cong-lai.png` (cần 2 nhân viên) · `MW-04-cho-xac-nhan-luu-tru.png` · `MW-04-d1-tu-choi.png` |
| MW-05 Chi tiết lịch hẹn | `MW-05-chi-tiet-spa.png` · `MW-05-chi-tiet-luu-tru.png` · `MW-05-d1-doi-lich-spa.png` · `MW-05-d2-doi-lich-luu-tru.png` · `MW-05-d3-huy-lich.png` |
| MW-06 Dịch vụ | `MW-06-dich-vu.png` · `MW-06-d1-dich-vu.png` · `MW-06-d2-ngung-dich-vu.png` |
| MW-07 Chuồng & giá | `MW-07-chuong.png` · `MW-07-gia-luu-tru.png` · `MW-07-d1-chuong.png` |
| MW-08 Nhân viên | `MW-08-nhan-vien.png` · `MW-08-d1-nhan-vien.png` · `MW-08-d2-vo-hieu-hoa.png` |
| MW-09 Khách bị khóa | `MW-09-khach-bi-khoa.png` · `MW-09-d1-go-khoa.png` |
| MW-10 Thanh toán | `MW-10-thanh-toan.png` · `MW-10-d1-thanh-toan-quay.png` |
| MW-11 Hồ sơ cá nhân | `MW-11-ho-so.png` |
| MW-12 Lịch làm việc | `MW-12-lich-lam-viec.png` · `MW-12-sua-ca-loi.png` (không thể rút ngắn ca) |
| MW-13 Cấu hình | `MW-13-cau-hinh-dat-lich.png` · `MW-13-cau-hinh-can-nang.png` |

## Chụp lại khi UI demo thay đổi

Công cụ trong `tools/` (Node.js 24, không cần cài thêm gói; dùng Google Chrome có sẵn qua DevTools Protocol, cần mạng để tải phông Be Vietnam Pro):

```bash
cd frontend/docs/design/wireframes/tools
node regions.cjs                    # sinh config.json từ danh sách ảnh và vùng
node capture.mjs config.json ..     # chụp lại toàn bộ ảnh vào wireframes/
node capture.mjs config.json .. CW-06   # chỉ chụp ảnh có tên chứa "CW-06"
```

- `regions.cjs`: mỗi ảnh gồm `hash` của UI demo (`#<màn>~<trạng thái>`), vai trò (`role`), hộp thoại (`modal`) và danh sách vùng `{ n, sel, i }` (bộ chọn CSS, `i` = phần tử hiển thị thứ i). Đổi số vùng ở đây thì sửa bảng “Vùng” trong UI-Screens cho khớp.
- `capture.mjs` báo “THIẾU” nếu bộ chọn không tìm thấy vùng (UI demo đổi cấu trúc) và trả mã thoát 1.
- Chrome ở chỗ khác: đặt biến môi trường `CHROME_PATH`. `config.json` là file sinh ra, không cần đưa lên Git.
