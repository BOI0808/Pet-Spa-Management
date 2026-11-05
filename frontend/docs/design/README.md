# Tài liệu Frontend – Hệ thống quản lý spa thú cưng

Bộ tài liệu giai đoạn 3 (Thiết kế Frontend) theo “Bộ tài liệu cần có trước khi code”, dựng từ tài liệu nghiệp vụ, tài liệu backend (`openapi.yaml`, `API-Notes.md`, `Authorization.md`…), **UI demo** `../SE358_PetSpa_UI_Demo.html` và mã 3 web trên nhánh `develop` (21/10/2026).

| # | File | Nội dung |
| --- | --- | --- |
| 9 | `User-Flows.md` | Danh sách 41 màn (CW, SW, MW) và hộp thoại, đường dẫn, sơ đồ điều hướng, điều hướng theo vai trò, 11 luồng nhiều bước (Mermaid). |
| 10 | `wireframes/` | 83 ảnh bố cục chụp từ UI demo, có đánh số vùng; công cụ chụp lại trong `wireframes/tools/`. Xem `wireframes/README.md`. |
| 11 | `UI-Screens.md` | Từng màn: đường dẫn, vai trò, vùng (khớp số trên ảnh), dữ liệu, API, trạng thái, hành vi, mã lỗi; bảng tra API theo màn; danh sách chênh lệch UI demo ↔ API (G-01 → G-21). |
| 12 | `Design-System.md` | Token màu/chữ/khoảng cách, khung bố cục 3 web, danh mục thành phần dùng chung, biểu tượng, co giãn, trợ năng, hiện trạng mã. |
| 13 | `Frontend-Architecture.md` | Công nghệ, thư mục, định tuyến và chặn truy cập, quản lý trạng thái, phiên đăng nhập (đề xuất R-01), gọi API, múi giờ, biến môi trường, chạy/build/triển khai, việc cần làm để mã khớp tài liệu. |
| 14 | `Frontend-Conventions.md` | Đặt tên, viết component, form và kiểm tra dữ liệu, bảng mã lỗi → giao diện, định dạng, style, danh sách cấm, Git/PR/DoD, module mẫu đề xuất. |

## Đọc gì khi làm việc

| Việc | Đọc |
| --- | --- |
| Làm một màn | Mục của màn trong `UI-Screens.md` + ảnh `wireframes/<mã>-*.png`; `Frontend-Architecture.md`; `Frontend-Conventions.md`; `Design-System.md` mục 4; endpoint liên quan trong `openapi.yaml`; BR liên quan; module mẫu (khi có). |
| Làm khung, menu, đăng nhập | `User-Flows.md` mục 2 – 4; `UI-Screens.md` mục 2.1; `Frontend-Architecture.md` mục 4, 6. |
| Chỉnh giao diện | Ảnh wireframe + UI demo + ảnh chụp màn thật; `Design-System.md`. |

## Thứ tự ưu tiên khi mâu thuẫn

Hành vi: văn bản (BR > UC > SA; `UI-Screens.md`) · Bố cục, câu chữ: UI demo / wireframe · Tên trường, endpoint, mã lỗi: `openapi.yaml`. Nội dung ghi **(Đề xuất)** và các mục “Điểm cần chốt” ở cuối mỗi file chờ nhóm duyệt.

## Lưu ý vị trí file

Các file tham chiếu nhau bằng tên; riêng `wireframes/tools/regions.cjs` trỏ tới UI demo bằng đường dẫn tương đối `../../../SE358_PetSpa_UI_Demo.html` (thư mục `docs/`). Đổi chỗ thư mục thì sửa đường dẫn này.
