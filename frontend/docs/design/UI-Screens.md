# UI Screens – Hệ thống quản lý spa thú cưng

*Mô tả bố cục, dữ liệu, trạng thái và hành vi từng màn hình của 3 web* · Phiên bản 1.0 · Ngày lập: 21/10/2026

**Nguồn:** **UI demo** `docs/SE358_PetSpa_UI_Demo.html` (bản giao diện nhóm đã chốt, chuẩn về bố cục và câu chữ), `openapi.yaml` + `API-Notes.md` (chuẩn về tên trường, endpoint, mã lỗi), *System Analysis & UI Design v1.3* (**SA**: 5.1, 6.1 – 6.6), *Authorization* (**Auth**), *Use Case* (**UC**), *Requirements v2* (**Req**: BR-xx, FR-xx), `User-Flows.md` (mã màn, đường dẫn, luồng).
**Nhãn:** **(Đề xuất)** tài liệu này đề xuất, chờ nhóm duyệt · **(Suy ra)** suy ra từ nguồn · **G-xx** chênh lệch giữa UI demo và API, xử lý tạm ghi ở mục 7.
**Thứ tự ưu tiên khi mâu thuẫn:** hành vi theo văn bản (tài liệu này, BR > UC > SA); bố cục theo ảnh wireframe / UI demo; tên trường và mã lỗi theo `openapi.yaml`.

---

## 1. Cách đọc

- Mỗi màn có 5 phần: **Thông tin chung** → **Vùng trên màn hình** → **Trạng thái** → **Hành vi** → **Mã lỗi xử lý tại màn** (khi có).
- **Số vùng** (1, 2, …) khớp số trong khung nét đứt màu hồng trên ảnh `wireframes/`. **Chữ A – E** là vùng của khung trang chung (mục 2.1). Ảnh chụp từ UI demo bằng `wireframes/tools/` (xem `wireframes/README.md`).
- Dữ liệu trong ảnh là dữ liệu minh họa của UI demo (“hôm nay” là thứ ba 06/10/2026).
- Tên trường viết đúng `camelCase` của `openapi.yaml`; giá trị enum hiển thị bằng nhãn ở mục 2.4.
- Câu chữ giao diện lấy nguyên từ UI demo và SA 6.6; câu nào UI demo chưa có thì ghi **(Đề xuất)**.
- Trạng thái chuẩn (mục 2.2) áp dụng cho mọi màn; phần “Trạng thái” của từng màn chỉ ghi điểm riêng.

---

## 2. Quy ước chung cho mọi màn

### 2.1 Khung trang

Màn đăng nhập, đăng ký không có khung (bố cục 2 cột: khối giới thiệu trái + form phải; dưới 980px chỉ còn form).

**Web khách hàng** – thanh trên sáng, nội dung rộng tối đa 1200px · `wireframes/CW-khung-chung.png`

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| A | Logo | Logo “Spa thú cưng”, bấm về CW-03. Dưới 860px chỉ còn biểu tượng. | – |
| B | Menu chính | Dịch vụ (CW-03) · Thú cưng (CW-04, CW-05) · Đặt lịch ▾ · Lịch hẹn (CW-08 → CW-10). Mục đang chọn nền Lagoon nhạt. Dưới 860px chỉ còn biểu tượng (nhãn vẫn có cho trình đọc màn hình). | – |
| C | Menu “Đặt lịch” | Lịch spa (“Tắm, cắt tỉa, vệ sinh, gói chăm sóc”) → CW-06; Lưu trú (“Gửi bé ở lại theo đêm”) → CW-07. Đóng khi bấm ra ngoài, Esc hoặc chọn mục. | – |
| D | Chuông thông báo | Biểu tượng chuông + chấm đỏ số chưa đọc (ẩn khi 0), bấm → CW-12. `aria-label` “Thông báo, n chưa đọc”. | `GET /notifications?page=1&pageSize=1` → `unread`; làm mới 60 giây/lần **(Đề xuất)** |
| E | Menu tài khoản | Avatar chữ cái đầu + tên ngắn → menu: Hồ sơ cá nhân (CW-13), Lịch sử dịch vụ (CW-11), Đăng xuất. | `GET /me` → `fullName` |

**Web nhân viên** – thanh trên Lagoon đậm (#084F57), nội dung rộng tối đa 1320px, vùng chạm tối thiểu 44px · `wireframes/SW-khung-chung-le-tan.png`, `wireframes/SW-khung-chung-nhan-vien-spa.png`

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| A | Logo | “Spa thú cưng / Web nhân viên”, bấm về SW-02. | – |
| B | Menu theo vai trò | LT: Lịch hẹn · Tiếp nhận · Trả thú cưng · Khách hàng · Đặt lịch thay · Chuồng · Thanh toán. NVS: Lịch hẹn · Lịch sử công việc · Dịch vụ. Cuộn ngang khi hẹp; dưới 640px chỉ còn biểu tượng. Danh sách khai báo trong `NAV_ITEMS` (`staff-web/components/layout/header-nav.tsx`). | `GET /me` → `staffRole` |
| C | Chuông thông báo (chỉ NVS) | Như CW (D), bấm → SW-13. | `GET /notifications?page=1&pageSize=1` → `unread` |
| D | Menu tài khoản | Avatar + tên + vai trò (“Lễ tân” / “Nhân viên spa”) → Hồ sơ cá nhân (SW-15), Danh mục dịch vụ (chỉ LT, SW-14), Đăng xuất. | `GET /me` → `fullName`, `staffRole` |

**Web quản lý** – thanh bên trái 248px Lagoon 800 (#063F45), nội dung rộng tối đa 1280px · `wireframes/MW-khung-chung.png`

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| A | Logo | “Spa thú cưng / Web quản lý”, bấm về MW-02. | – |
| B | Menu | Tổng quan · Lịch hẹn · Chờ xác nhận · Dịch vụ · Chuồng & giá · Nhân viên · Lịch làm việc · Khách bị khóa · Thanh toán · Cấu hình (User-Flows 3.3). Dưới 980px thanh bên thành thanh ngang cuộn được. | – |
| C | Số chờ xử lý | Huy hiệu Apricot cạnh “Chờ xác nhận” = số lịch `Pending`, ẩn khi 0. | `GET /appointments?status=Pending&page=1&pageSize=1` → `total`; làm mới 60 giây/lần **(Đề xuất)** |
| D | Tài khoản | Avatar + tên hiển thị + “Quản lý”, bấm → MW-11; nút biểu tượng Đăng xuất. Tên hiển thị: QL không có họ tên trong API nên dùng `userName` (G-11). | `GET /me` |

### 2.2 Trạng thái chuẩn

| Trạng thái | Hiển thị | Thành phần |
| --- | --- | --- |
| Đang tải lần đầu | Danh sách, bảng, thẻ: khung xương (skeleton) đúng hình dạng nội dung. Không dùng spinner toàn trang. | `Skeleton` |
| Đang gửi | Nút gửi hiện spinner, chữ “Đang gửi…”, bị vô hiệu hóa để chống bấm đúp (đặt lịch, thanh toán, xác nhận). | `Button loading` |
| Rỗng | Minh họa ngắn + một câu + hành động gợi ý (ví dụ “Chưa có thú cưng – Thêm thú cưng”). | `EmptyState` |
| Lỗi khi tải | `ErrorAlert` tại vị trí nội dung + nút “Thử lại” (gọi lại query). Mất mạng/5xx dùng câu chung. | `ErrorAlert` |
| Lỗi thao tác (409, 400 nghiệp vụ) | `ErrorAlert` ngay tại chỗ thao tác (trên nút hoặc đầu form), sau đó tải lại dữ liệu liên quan. Lỗi của một trường hiện dưới trường (`FieldError`). | `ErrorAlert`, `FieldError` |
| Thành công tức thời | Toast thành công, tự ẩn sau khoảng 3,4 giây. | `useToast().showSuccess` |
| Không có quyền (403 `FORBIDDEN`, sai vai trò trong web) | Giữ khung trang, thay nội dung bằng “Bạn không có quyền xem trang này” / “Lỗi 403. Trang nằm ngoài phạm vi vai trò của bạn.” | `ForbiddenState` |
| Không tìm thấy (404) | “Không tìm thấy lịch hẹn / hồ sơ” + nút quay lại danh sách **(Đề xuất)**. | `NotFoundState` |
| Hết phiên (401 sau khi làm mới thất bại) | Về màn đăng nhập (User-Flows 4.2). | – |
| Nút bị khóa | Nút xám + lý do ngay dưới nút (`btn-reason`, biểu tượng khóa), ví dụ “Cần ảnh trước chăm sóc hợp lệ.” | `Button disabledReason` |

### 2.3 Xử lý lỗi theo mã HTTP

Theo SA 6.6 và mã đã có trong `lib/api/errors.ts`: mất mạng → “Không kết nối được máy chủ, vui lòng thử lại.”; 5xx → “Có lỗi xảy ra, vui lòng thử lại sau.”; 429 → “Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.” (kiểu cảnh báo có đồng hồ); 403 `FORBIDDEN` → `ForbiddenState`; còn lại → `detail` (thiếu thì `title`) của error envelope. Câu riêng cho từng mã lỗi nghiệp vụ: `Frontend-Conventions.md` mục 5.

### 2.4 Nhãn hiển thị cho giá trị enum

| Enum (openapi) | Giá trị → nhãn hiển thị |
| --- | --- |
| `AppointmentStatus` (badge màu, luôn kèm chữ) | `Pending` Chờ xác nhận (st-1) · `Confirmed` Đã xác nhận (st-2) · `Received` Đã tiếp nhận (st-3) · `InProgress` Đang thực hiện (st-4) · `InStay` Đang lưu trú (st-4) · `Completed` Hoàn tất (st-5) · `Cancelled` Đã hủy (st-6) |
| `AppointmentType` | `Spa` Spa (biểu tượng giọt nước, Lagoon) · `Hotel` Lưu trú (biểu tượng giường, tím #6A5BC4) |
| `CancelReason` | `CustomerCancelled` Khách hàng chủ động hủy · `StoreUnable` Cửa hàng không thể đáp ứng · `CustomerBeyondDeadline` Theo yêu cầu của khách, ngoài thời hạn tự hủy · `NoShow` Vắng mặt quá 15 phút sau giờ hẹn · `CostNotConfirmed` Không xác nhận chi phí mới |
| `Species` | `Dog` Chó · `Cat` Mèo · `Rabbit` Thỏ · `GuineaPig` Chuột lang (kèm hình minh họa và sắc nền theo loài) |
| `SizeGroup` | `Small` Nhỏ · `Medium` Vừa · `Large` Lớn (hiển thị “Nhóm Nhỏ”…) |
| `Temperament` | `Calm` Hiền · `Normal` Bình thường · `Difficult` Khó tính, dữ |
| `PaymentKind` | `Spa` Khoản spa · `Stay` Tiền lưu trú · `LateFee` Phí trả muộn |
| `PaymentStatus` | `Unpaid` Chưa thanh toán (pay-0) · `Paid` Đã thanh toán (pay-1) |
| `PaymentMethod` | `Cash` Tiền mặt · `BankQR` Chuyển khoản QR · `Online` Trực tuyến (kèm cổng nếu biết) |
| `Gateway` | `VNPAY` VNPAY · `MoMo` Ví MoMo |
| `SlotStatus` | `Available` còn chỗ · `Full` Đã kín · `NotAccepted` ghi chú theo mốc muộn nhất của dịch vụ (ví dụ “chỉ tắm / vệ sinh nhẹ”, “mốc cuối cắt tỉa”) |
| `PhotoKind` | `Before` Trước · `After` Sau |
| `StaffRole` | `Receptionist` Lễ tân · `SpaStaff` Nhân viên spa |
| `NotificationType` | `BookingReceived` (lịch, nền st-1) · `ConfirmedAssigned` (dấu kiểm / người, nền st-2) · `StatusChanged` (bảng kẹp, nền st-3) · `Cancelled` (dấu x, nền st-6) · `PaymentRecorded` (ví, nền Success nhạt) · `CostConfirmation` (cân, nền Apricot) |
| `slots[].group` | `Morning` Sáng · `Evening` Chiều, tối (openapi chỉ minh họa 2 giá trị này – API-Notes 8 #13); giá trị cho buổi trưa chưa chốt (đề xuất `Noon` → Trưa). Gặp giá trị lạ thì xếp theo giờ như SA 2.3.3: 09:00 – 11:00 Sáng, 12:00 – 14:00 Trưa, 15:00 – 19:00 Chiều, tối **(Đề xuất)** |

### 2.5 Định dạng

Tiền `270.000đ` (số nguyên VND, dấu chấm hàng nghìn); ngày `dd/MM/yyyy` (rút gọn `dd/MM` trong phiếu hẹn, kèm thứ “T3 06/10”); giờ 24 giờ `HH:mm`; khoảng giờ “09:00 – 11:00”; mọi thời gian hiển thị theo múi giờ cửa hàng `Asia/Ho_Chi_Minh`; số trong bảng dùng chữ số đều. Chi tiết: `Frontend-Conventions.md` mục 7.

### 2.6 Mã lịch hẹn hiển thị

UI demo hiển thị mã ngắn “LH-1029”; API chỉ có `appointmentId` (uuid). Tạm thời hiển thị “LH-” + 8 ký tự đầu của `appointmentId` viết hoa (ví dụ `LH-5F1C2A9B`) **(Đề xuất, G-01)**.

---

## 3. Web khách hàng

### CW-01 – Đăng ký

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dang-ky` (không khung) |
| Vai trò | Ẩn danh; đã đăng nhập thì chuyển về CW-03 |
| Mục đích | Khách tạo tài khoản; số điện thoại là tên đăng nhập. |
| Tham chiếu | UC-01 · FR-ACC-01 · BR-01 · X-02 |
| Wireframe | `wireframes/CW-01-dang-ky.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khối giới thiệu | Logo, tiêu đề “Đặt lịch tắm, cắt tỉa hay gửi bé ở lại, chỉ vài bước trên web.”, mô tả, 4 hình thú cưng. Ẩn dưới 980px. | Tĩnh |
| 2 | Form đăng ký | Tiêu đề “Tạo tài khoản”, chú thích “Số điện thoại sẽ là tên đăng nhập của bạn.”; ô Họ tên*, Số điện thoại* (`inputmode="tel"`), Email (không bắt buộc), Mật khẩu*, Nhập lại mật khẩu*; nút chính “Tạo tài khoản” (to, rộng hết); dòng “Đã có tài khoản? Đăng nhập” → CW-02. | `POST /auth/register` `{ userName, fullName, password, email? }` |

**Kiểm tra dữ liệu nhập** (trước khi gọi API): Họ tên bắt buộc, ≤ 150 ký tự (“Vui lòng nhập họ tên.”); Số điện thoại bắt buộc, đúng định dạng số điện thoại Việt Nam, ≤ 20 ký tự **(Đề xuất: 10 chữ số, bắt đầu bằng 0; bỏ khoảng trắng trước khi gửi)**; Email nếu có phải đúng định dạng; Mật khẩu bắt buộc; Nhập lại phải trùng (“Mật khẩu nhập lại không khớp.” **(Đề xuất)**). Ràng buộc độ mạnh mật khẩu do backend (Identity) quyết định; lỗi 400 hiện `detail` của envelope.

**Hành vi**
- Gửi thành công (201) → chuyển CW-02, toast “Đã tạo tài khoản. Mời bạn đăng nhập.” (UI demo). Không tự đăng nhập **(Suy ra từ UI demo)**.
- Không gửi `role`; vai trò luôn là Customer (Auth 3.2).

**Mã lỗi tại màn:** 409 `DUPLICATE_CONTACT` → lỗi dưới ô Số điện thoại “Thông tin liên hệ này đã được sử dụng. Hãy đăng nhập hoặc dùng số khác.”; 400 `VALIDATION_ERROR` → `ErrorAlert` đầu form; 429 → cảnh báo nhắc thử lại sau.

### CW-02 – Đăng nhập

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dang-nhap` (`?next=`) (không khung) |
| Vai trò | Ẩn danh |
| Mục đích | Đăng nhập web khách hàng. |
| Tham chiếu | UC-02 · FR-ACC-02 · Auth 3.3, 3.6 · SD-01 |
| Wireframe | `wireframes/CW-02-dang-nhap.png` (trạng thái “Thử quá nhiều lần”) |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khối giới thiệu | “Chào mừng bạn quay lại. Bé nhà mình hôm nay thế nào?” + mô tả. Ẩn dưới 980px. | Tĩnh |
| 2 | Thông báo lỗi | Ẩn mặc định. Sai thông tin: alert danger “Thông tin đăng nhập không đúng.” (không nêu trường nào sai). 429: alert cảnh báo có đồng hồ “Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.” | Phản hồi của `POST /auth/login` |
| 3 | Form | Số điện thoại (biểu tượng điện thoại), Mật khẩu (biểu tượng chìa khóa); nút “Đăng nhập”; “Chưa có tài khoản? Đăng ký” → CW-01; “Cần hỗ trợ tài khoản? Gọi hotline 1900 6868” (G-16). | `POST /auth/login` `{ userName, password }` → `GET /me` |

**Hành vi**
- Enter trong ô mật khẩu = bấm Đăng nhập. Hai ô bắt buộc (lỗi dưới trường nếu trống, không gọi API).
- Thành công: kiểm tra `role` = `Customer`; đúng → trang đích (User-Flows 4.1); sai → thu hồi phiên, hiện “Tài khoản không có quyền truy cập web này” (Auth 3.6).

**Mã lỗi tại màn:** 401 (sai thông tin hoặc tài khoản bị vô hiệu hóa) → vùng 2 kiểu lỗi; 429 → vùng 2 kiểu cảnh báo; 400 → lỗi dưới trường.

### CW-03 – Trang chủ: danh mục dịch vụ và giá lưu trú

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/` |
| Vai trò | KH |
| Mục đích | Xem dịch vụ, giá theo loài/nhóm kích cỡ, giá lưu trú; lối tắt đặt lịch; nhắc lịch đang diễn ra. |
| Tham chiếu | UC-09 · FR-SVC-04, FR-HTL-03 · BR-11, BR-12, BR-19, BR-22 |
| Wireframe | `wireframes/CW-03-trang-chu.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Lời chào + nút đặt lịch | “Chào <tên>”, tiêu đề “Bé cần tắm, cắt tỉa hay ở lại vài đêm?”, mô tả; nút “Đặt lịch spa” → CW-06, “Đặt lưu trú” → CW-07. | `GET /me` → `fullName` |
| 2 | Thẻ “Đang diễn ra” | Lịch gần nhất đang ở cửa hàng hoặc sắp tới: hình thú cưng, “<tên> đang ở cửa hàng”, loại + khung giờ, badge trạng thái. Nếu lịch có yêu cầu xác nhận chi phí đang chờ: cảnh báo “Cần bạn xác nhận chi phí mới” + đồng hồ đếm ngược + liên kết “Xem và xác nhận” → CW-09. Không có lịch nào thì ẩn thẻ. | `GET /appointments?page=1&pageSize=20` → chọn lịch `Received`/`InProgress`/`InStay`, nếu không có thì lịch `Confirmed`/`Pending` gần nhất (Suy ra); `GET /appointments/{id}` → `pendingCostConfirmation.expiresAt` |
| 3 | Chọn loài | Nhóm nút: Chó · Mèo · Thỏ · Chuột lang. | Trạng thái giao diện |
| 4 | Bảng dịch vụ spa | Cột: Dịch vụ (tên, mô tả, “Nhận đến <latestStartTime>”) · Nhóm Nhỏ · Nhóm Vừa · Nhóm Lớn (giá + thời lượng). Ô không có dòng giá: “Không áp dụng” (chuột lang không có nhóm Vừa). Chú thích cách xác định nhóm kích cỡ. | `GET /services` → `name`, `description`, `latestStartTime`, `pricing[]` (`species`, `sizeGroup`, `price`, `durationMinutes`) |
| 5 | Giá lưu trú mỗi đêm | Bảng Loài · Nhóm · Chỗ ở · Thức ăn · Cộng/đêm; chú thích phí đón trễ “… <lateFeePerBlock> cho mỗi 60 phút tiếp theo”. | `GET /hotel/pricing` → `pricing[]` (`pricePerNight`, `foodPerNight`), `lateFeePerBlock` |
| 6 | Trước khi đặt lịch + bảng nhóm kích cỡ | 4 lưu ý: đổi/hủy miễn phí trước giờ hẹn 60 phút; giữ chỗ 15 phút, vắng mặt quá 3 lần/30 ngày bị khóa; cân lại khi tiếp nhận, 30 phút xác nhận; cách thanh toán. Bảng mốc nhóm kích cỡ (BR-19). | Tĩnh theo giá trị mặc định SA 7.2 (G-03) |
| 7 | Thông tin cửa hàng | Địa chỉ, hotline, giờ mở cửa. | Tĩnh (G-16) |

**Trạng thái:** bảng dịch vụ rỗng với loài đang chọn → “Chưa có dịch vụ cho loài này.” **(Đề xuất)**; lỗi tải một khối chỉ hiện `ErrorAlert` trong khối đó, các khối khác vẫn hiển thị.

### CW-04 – Thú cưng của tôi

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thu-cung` |
| Vai trò | KH (chỉ hồ sơ của mình) |
| Mục đích | Xem hồ sơ thú cưng đang hoạt động; thêm, sửa, gỡ; đặt lịch nhanh. |
| Tham chiếu | UC-06, UC-07 · FR-PET-02, FR-PET-03 · BR-16, BR-25 |
| Wireframe | `wireframes/CW-04-thu-cung.png`, `wireframes/CW-04-thu-cung-rong.png`, `wireframes/CW-04-d1-go-ho-so.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Thú cưng của tôi”, mô tả; nút chính “Thêm thú cưng” → CW-05 `/thu-cung/them`. | – |
| 2 | Thẻ thú cưng (lưới 3 cột) | Hình theo loài, tên, “<Loài> <giống>”, thẻ “Nhóm <sizeGroup>”, thẻ tính cách; 3 ô Cân nặng / Cao vai (“Không cần” nếu không phải chó) / Lông; ghi chú. Menu ⋯: Sửa hồ sơ → CW-05, Lịch sử dịch vụ → CW-11 `?petId=`, Gỡ hồ sơ (chữ đỏ) → CW-04·D1. Chân thẻ: “Đặt lịch spa” → CW-06 `?petId=`, “Sửa hồ sơ”. | `GET /pets?page=1&pageSize=50` → `items[]` (`name`, `species`, `breed`, `temperament`, `weightKg`, `heightCm`, `coatNote`, `notes`, `sizeGroup`) |
| 3 | Thẻ “Thêm thú cưng” | Thẻ viền nét đứt, bấm → CW-05. | – |
| 4 | Gợi ý | Alert info “Cân nặng của bé thay đổi? Cập nhật hồ sơ để giá tạm tính sát hơn…” | Tĩnh |
| 5 | Trạng thái rỗng | Hình 3 loài, “Chưa có thú cưng”, “Thêm hồ sơ cho bé để xem giá đúng nhóm kích cỡ và bắt đầu đặt lịch.”, nút “Thêm thú cưng”. | `items` rỗng |

**CW-04·D1 – Gỡ hồ sơ thú cưng?** (modal nguy hiểm): “Bé sẽ không còn trong danh sách của bạn.”; 2 gạch đầu dòng: đã có lịch hẹn → ngừng hoạt động và ẩn, cửa hàng vẫn giữ dữ liệu; chưa từng đặt lịch → xóa hẳn (BR-25). Nút “Giữ hồ sơ” (ghost), “Gỡ hồ sơ” (danger đặc). Xác nhận → `DELETE /pets/{petId}` → 204 → đóng hộp thoại, tải lại danh sách, toast “Đã gỡ hồ sơ thú cưng”.

**Mã lỗi tại màn:** 403/404 khi gỡ → `ErrorAlert` trong hộp thoại, tải lại danh sách.

### CW-05 – Tạo / sửa hồ sơ thú cưng

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thu-cung/them`, `/thu-cung/[petId]/sua` |
| Vai trò | KH |
| Mục đích | Nhập hồ sơ để hệ thống xác định nhóm kích cỡ. |
| Tham chiếu | UC-05, UC-06 · FR-PET-01, 02, 04 · BR-02, BR-19 · X-10 |
| Wireframe | `wireframes/CW-05-ho-so-thu-cung.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đường dẫn + tiêu đề | “Thú cưng của tôi › Thêm thú cưng” hoặc “› Sửa hồ sơ <tên>”; mô tả “Thông tin do bạn khai, cửa hàng đối chiếu lại cân nặng khi tiếp nhận.” | Sửa: `GET /pets/{petId}` |
| 2 | Loài* | 4 thẻ chọn (hình + nhãn); gợi ý “Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.” | `species` |
| 3 | Thông tin cơ bản | Tên*, Giống*, Cân nặng (kg)* (hậu tố “kg”), Chiều cao vai (cm) – bắt buộc với chó, gợi ý “Bắt buộc với chó, đo từ mặt đất tới vai.”; loài khác: ô bị vô hiệu, nhãn “(chỉ cần với chó)”. | `name`, `breed`, `weightKg`, `heightCm` |
| 4 | Tính cách* | 3 thẻ chọn: Hiền (“Dễ gần, hợp tác”), Bình thường (“Đôi lúc cần dỗ”), Khó tính, dữ (“Hay cắn, cào, sợ người lạ”); gợi ý “Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn.” Mặc định Bình thường. | `temperament` (mặc định `Normal`, API-Notes 8 #11) |
| 5 | Lông, ghi chú | Đặc điểm lông (không bắt buộc, ≤ 255), Ghi chú (tiền sử bệnh, lưu ý chăm sóc). | `coatNote`, `notes` |
| 6 | Nút | “Hủy bỏ” → CW-04; “Lưu hồ sơ” (chính). | `POST /pets` hoặc `PUT /pets/{petId}` |
| 7 | Nhóm kích cỡ dự kiến | Hiển thị tạm tính phía web theo bảng mốc BR-19: “Theo cân nặng …”, “Theo chiều cao …” (chó), “Lấy nhóm cao hơn”; thiếu dữ liệu → “Chưa đủ dữ liệu”. Chú thích “Nhóm chính thức do hệ thống xác định khi lưu…”. | Tính ở web chỉ để xem (Suy ra); kết quả chính thức: `sizeGroup` trong phản hồi |

**Kiểm tra dữ liệu nhập** (SA 6.6): Tên, Loài, Giống bắt buộc (“Vui lòng nhập tên thú cưng.”); Cân nặng > 0; chó phải có chiều cao (“Vui lòng nhập chiều cao của chó.”); loài ngoài 4 loài không chọn được. Không gửi `sizeGroup`.

**Hành vi:** lưu thành công → CW-04, toast “Đã lưu hồ sơ thú cưng”. Nếu đến từ CW-06 (`?returnTo=` **(Đề xuất)**) thì quay lại CW-06 với thú cưng vừa tạo được chọn.

**Mã lỗi tại màn:** 400 → `ErrorAlert` đầu form (giữ dữ liệu đã nhập); 403/404 khi sửa → `ForbiddenState` / `NotFoundState`.

### CW-06 – Đặt lịch spa

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dat-lich/spa` (`?petId=` chọn sẵn thú cưng, `?step=1\|2\|3`) |
| Vai trò | KH |
| Mục đích | Chọn thú cưng, dịch vụ, ngày và mốc giờ còn chỗ, gửi yêu cầu “Chờ xác nhận”. |
| Tham chiếu | UC-10 · FR-BOOK-01 → 03 · BR-02, BR-10 → 13, BR-15, BR-18 · SA 2.3.3 · UF-01 |
| Wireframe | `wireframes/CW-06-dat-lich-spa-b1.png`, `…-b2.png`, `…-b3.png`, `…-bi-khoa.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Thanh bước | 1 Thú cưng & dịch vụ · 2 Chọn khung giờ · 3 Xác nhận; bước xong có dấu kiểm xanh. Dưới 640px chỉ hiện nhãn bước hiện tại. | `?step` |
| 2 | Chọn thú cưng (bước 1) | Thẻ chọn: hình, tên, “<Loài> <giống>, <cân nặng> kg, nhóm <…>”; liên kết “Thêm thú cưng” → CW-05. | `GET /pets` |
| 3 | Chọn dịch vụ (bước 1) | “Chọn dịch vụ cho <tên>”, “Chỉ hiện dịch vụ áp dụng cho <loài>. Giá và thời lượng theo nhóm <…>.”; thẻ chọn nhiều: tên, thời lượng, “Nhận đến <latestStartTime>”, giá. | `GET /services?species=&sizeGroup=` |
| 4 | Tóm tắt lịch hẹn (cột phải, dính khi cuộn) | Thú cưng + thẻ nhóm; từng dịch vụ (giá, phút); Thời lượng (tổng phút), Số nhân viên cần, Thời gian (từ bước 2); “Tạm tính … Chưa gồm thay đổi khi cân thực tế”. Nút theo bước: “Tiếp tục: chọn khung giờ” / “Tiếp tục: xác nhận” + “Quay lại” / “Gửi yêu cầu đặt lịch” + chú thích “Lịch hẹn ở trạng thái Chờ xác nhận cho đến khi cửa hàng xác nhận.” | Bước 1: tính ở web (tổng giá, tổng phút; số nhân viên = lớn nhất `staffRequired`, tối thiểu 2 nếu `Difficult`) chỉ để xem; bước 2–3: `durationMinutes`, `staffRequired` từ `GET /spa/slots` |
| 5 | Chọn ngày (bước 2) | Dải 7 ngày từ hôm nay (“T3 06/10”…) **(Đề xuất, theo UI demo)**; ngày đang chọn nền Lagoon. | – |
| 6 | Chọn khung giờ (bước 2) | “Chọn khung giờ, <thứ> <ngày>”; 3 nhóm Sáng/Trưa/Chiều, tối; mỗi mốc: còn chỗ / đang chọn (“kết thúc HH:mm”) / Đã kín (nét đứt, gạch ngang, không focus được) / không nhận (nền vàng, ghi chú); chú giải 4 trạng thái; alert info “Lịch này cần <n> nhân viên trong <d>. Cửa hàng sẽ xếp nhân viên khi xác nhận, bạn không cần chọn. …” | `GET /spa/slots?date=&petId=&serviceIds=` → `durationMinutes`, `staffRequired`, `bufferMinutes`, `slots[]` (`time`, `group`, `status`) |
| 7 | Kiểm tra lại (bước 3) | Danh sách định nghĩa: Thú cưng, Dịch vụ, Thời gian “<thứ> dd/MM/yyyy, HH:mm – HH:mm”, Nhân viên “Cần <n> nhân viên, cửa hàng xếp khi xác nhận”, Tạm tính. | Dữ liệu đã chọn |
| 8 | Lưu ý cho lịch (bước 3) | Hạn tự đổi/hủy, giờ giữ chỗ, cân lại khi tiếp nhận, thanh toán sau khi hoàn tất. | Giờ cụ thể phụ thuộc cấu hình (G-03): tạm hiển thị câu chung không có giờ **(Đề xuất)** |
| 9 | Bị khóa tự đặt lịch | Alert danger “Tài khoản tạm thời không thể tự đặt lịch” + “Bạn đã vắng mặt quá 3 lần trong 30 ngày gần đây. Vui lòng liên hệ cửa hàng qua hotline …”; nút gửi bị khóa kèm lý do. | Hiện khi `POST /appointments/spa` trả 403 `BOOKING_LOCKED` (G-04) |

**Trạng thái:** bước 2 đang tải mốc giờ → khung xương lưới mốc; không có mốc nào còn chỗ trong ngày → “Ngày này đã kín, vui lòng chọn ngày khác.” **(Đề xuất)**; khách chưa có thú cưng → `EmptyState` “Chưa có thú cưng” + nút Thêm thú cưng.

**Hành vi**
- Bước 1 → 2 chỉ khi đã chọn thú cưng và ≥ 1 dịch vụ (“Vui lòng chọn ít nhất một dịch vụ.”). Đổi thú cưng thì bỏ chọn dịch vụ không áp dụng; đổi thú cưng/dịch vụ thì xóa mốc giờ đã chọn.
- Bước 2: đổi ngày → gọi lại `GET /spa/slots`; chỉ chọn được mốc `Available`.
- Gửi: `POST /appointments/spa` `{ petId, serviceIds, slotStart }` (`slotStart` = ngày + mốc theo múi giờ cửa hàng, ISO 8601 có `+07:00`). Không gửi nhân viên, giá, `status`. 201 → CW-09 của lịch mới, toast “Đã gửi yêu cầu đặt lịch <mã>”.
- Bước được giữ trên `?step` để nút Quay lại của trình duyệt hoạt động; mở thẳng bước 2/3 khi chưa đủ dữ liệu thì về bước 1 **(Đề xuất)**.

**Mã lỗi tại màn:** 409 `SLOT_FULL` → về bước 2, tải lại mốc, `ErrorAlert` “Mốc giờ vừa kín, vui lòng chọn mốc khác.”; 403 `BOOKING_LOCKED` → vùng 9; 400 → `ErrorAlert` (“Dịch vụ này không nhận ở mốc giờ đã chọn.” khi mốc muộn hơn mốc muộn nhất); 429 → cảnh báo thử lại sau.

### CW-07 – Đặt lịch lưu trú

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dat-lich/luu-tru` (`?petId=`) |
| Vai trò | KH |
| Mục đích | Chọn thú cưng, thời điểm nhận/trả, xem còn chỗ và tiền lưu trú tạm tính, gửi yêu cầu. |
| Tham chiếu | UC-28 · FR-HTL-04 · BR-15, BR-18, BR-21, BR-22 · UF-02 |
| Wireframe | `wireframes/CW-07-dat-lich-luu-tru.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Đặt lịch lưu trú”, “Bé ở chuồng riêng hợp loài và kích cỡ, có thức ăn do cửa hàng chuẩn bị. Lưu trú không kèm dịch vụ spa.” | – |
| 2 | Chọn thú cưng | Thẻ chọn (tên, loài, giống, nhóm). | `GET /pets` |
| 3 | Thời gian gửi và đón | Ngày nhận*, Giờ nhận*, Ngày trả*, Giờ trả*; chú thích “Số đêm tính theo ngày nhận và ngày trả. Cửa hàng giữ chỗ tối đa 15 phút sau giờ nhận.”; kết quả: alert success “Còn chỗ – Còn chuồng phù hợp cho <loài> nhóm <…> trong cả <n> đêm …” hoặc alert danger “Hết chỗ – Hết chỗ trong thời gian này, vui lòng chọn ngày khác.” | `GET /hotel/availability?from=&to=&petId=` → `available`, `nights`, `estimatedAmount` |
| 4 | Gợi ý spa | Alert neutral “Muốn tắm hoặc cắt tỉa cho bé trong thời gian lưu trú? Hãy đặt lịch spa riêng.” → CW-06. | – |
| 5 | Tạm tính (cột phải) | Thú cưng; Nhận; Trả; Số đêm; Chỗ ở/đêm; Thức ăn/đêm; “Tiền lưu trú” = `estimatedAmount` kèm công thức “n × (giá + thức ăn)”; lưu ý thanh toán tại quầy khi gửi bé, có thể thay đổi khi cân lại, phí đón trễ. Nút “Gửi yêu cầu lưu trú”; bị khóa kèm lý do khi hết chỗ / ngày trả không hợp lệ / tài khoản bị khóa. | `estimatedAmount`, `nights`; đơn giá từ `GET /hotel/pricing` theo `species` + `sizeGroup` của thú cưng |

**Kiểm tra dữ liệu nhập:** đủ 4 ô; thời điểm trả sau thời điểm nhận và ngày trả sau ngày nhận (“Ngày trả phải sau ngày nhận.” dưới ô Ngày trả, không gọi API); thời điểm nhận không ở quá khứ **(Đề xuất)**. Đủ và hợp lệ → tự gọi kiểm tra còn chỗ (trễ 400ms sau lần sửa cuối) **(Đề xuất)**.

**Hành vi:** `POST /appointments/hotel` `{ petId, plannedCheckIn, plannedCheckOut }` → 201 → CW-09 lịch mới, toast “Đã gửi yêu cầu lưu trú”.

**Mã lỗi tại màn:** 409 `NO_CAPACITY` → alert “Hết chỗ…” và gọi lại kiểm tra; 403 `BOOKING_LOCKED` → alert danger “Tài khoản tạm thời không thể tự đặt lịch…” (như CW-06 vùng 9); 400 → lỗi dưới ô Ngày trả.

### CW-08 – Lịch hẹn của tôi

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen` (`?tab=upcoming\|completed\|cancelled`, `?type=Spa\|Hotel`) |
| Vai trò | KH |
| Mục đích | Xem các lịch spa và lưu trú của mình theo nhóm trạng thái. |
| Tham chiếu | UC-11 · FR-BOOK-04 · BR-16 |
| Wireframe | `wireframes/CW-08-lich-hen.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Lịch hẹn của tôi”, mô tả; nút phụ “Lịch sử dịch vụ” → CW-11, nút chính “Đặt lịch spa” → CW-06. | `GET /pets` (tên thú cưng trong mô tả) |
| 2 | Tab | “Đang diễn ra và sắp tới” (`Pending`, `Confirmed`, `Received`, `InProgress`, `InStay`) · “Đã hoàn tất” (`Completed`) · “Đã hủy” (`Cancelled`), mỗi tab kèm số lượng. | Tab 2, 3: `GET /appointments?status=Completed\|Cancelled` → `total`; tab 1: G-06 |
| 3 | Lọc loại | Chip: Tất cả · Spa · Lưu trú. | `type` |
| 4 | Danh sách phiếu hẹn | Mỗi phiếu: cuống trái (giờ + “Hôm nay, 06/10” với spa; “09/10 đến 11/10” với lưu trú, nền tím nhạt; lịch hủy gạch ngang), thân (hình, tên thú cưng + loại, mô tả: dịch vụ + nhân viên / số đêm + chuồng + tiền lưu trú / lý do hủy), thẻ cảnh báo “Cần bạn xác nhận chi phí mới, còn mm:ss” nếu có, cột phải (badge trạng thái, mã lịch). Bấm phiếu → CW-09. | `GET /appointments?type=&status=&page=&pageSize=` → `items[]` (`petName`, `type`, `status`, `slotStart`, `slotEnd`, `plannedCheckIn`, `plannedCheckOut`, `cancelReason`); dịch vụ, nhân viên: G-05 |

**Trạng thái:** rỗng theo tab: “Chưa có lịch hẹn sắp tới” + nút “Đặt lịch spa”; “Chưa có lịch hẹn đã hoàn tất”; “Không có lịch hẹn đã hủy” **(Đề xuất)**. Phân trang 20 lịch/trang (`Pager` ở cuối danh sách).

**Hành vi:** tab, bộ lọc ghi vào tham số truy vấn; sắp xếp phiếu theo thời gian hẹn tăng dần cho tab 1, giảm dần cho tab 2, 3 (G-06).

### CW-09 – Chi tiết lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen/[appointmentId]` (`?payment=return` khi quay về từ cổng thanh toán) |
| Vai trò | KH (lịch của mình) |
| Mục đích | Theo dõi trạng thái, ảnh trước/sau, thanh toán; xác nhận chi phí mới; đổi/hủy trong hạn. |
| Tham chiếu | UC-11, 14, 19, 24, 25, 30 · FR-BOOK-04, FR-CHG-01, 02, FR-EXE-09, 11, FR-PAY-03, 04 · BR-08, BR-09, BR-17, BR-20, BR-23 · UF-06, UF-10, UF-11 |
| Wireframe | `wireframes/CW-09-chi-tiet-can-xac-nhan.png`, `…-hoan-tat.png`, `…-luu-tru.png`, `wireframes/CW-09-ket-qua-thanh-toan.png`, `wireframes/CW-09-d1-huy-lich.png`, `…-d2-tu-choi-chi-phi.png`, `…-d3-thanh-toan-truc-tuyen.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đầu trang | Đường dẫn “Lịch hẹn của tôi › <mã>”; hình thú cưng lớn; “Lịch spa của <tên>” / “Lịch lưu trú của <tên>”; badge trạng thái lớn; “Mã <mã>. <thứ> dd/MM/yyyy, HH:mm – HH:mm” hoặc “Nhận HH:mm <thứ> dd/MM, trả HH:mm <thứ> dd/MM/yyyy”. | `GET /appointments/{appointmentId}` (`AppointmentDetail`); `GET /pets/{petId}` → `species`, `breed` |
| 2 | Vòng đời | Spa: Chờ xác nhận → Đã xác nhận → Đã tiếp nhận → Đang thực hiện → Hoàn tất; Lưu trú: Chờ xác nhận → Đã xác nhận → Đang lưu trú → Hoàn tất; bước xong: chấm Lagoon có dấu kiểm; bước hiện tại: chấm có vòng sáng; lịch hủy: dừng ở bước cuối đã đạt + chấm đỏ “Đã hủy”. Mốc thời gian dưới mỗi bước khi có (G-02). Dưới 640px hiển thị dọc. | `status`, `createdAt`, `cancelledAt` |
| 3 | Banner xác nhận chi phí mới | Chỉ khi có `pendingCostConfirmation`: biểu tượng cân, “Cần bạn xác nhận chi phí mới”, đồng hồ đếm ngược tới `expiresAt`; “<tên> nặng <actualWeightKg> kg khi cân tại cửa hàng (hồ sơ: <weightKg> kg), chuyển từ nhóm <cũ> lên nhóm <newSizeGroup>. Từ chối hoặc không phản hồi trước HH:mm, lịch hẹn sẽ bị hủy.”; số tiền cũ gạch ngang → mới; nút “Đồng ý chi phí mới” (chính), “Từ chối” (danger) → CW-09·D2. | `pendingCostConfirmation` (`actualWeightKg`, `newSizeGroup`, `oldAmount`, `newAmount`, `expiresAt`); `POST /appointments/{id}/cost-confirmation/respond` |
| 4 | Dịch vụ và tiến độ / Chi tiết lưu trú | Spa: mỗi dịch vụ một dòng (dấu tick xanh khi xong, tên, thời lượng hoặc “Xong lúc HH:mm. <NV> ghi chú: …”, giá). Khi chờ xác nhận chi phí: chú thích giá theo nhóm mới. Lưu trú: Chuồng (G-05), Nhận (kèm “giữ chỗ đến …”, G-03), Trả dự kiến, Số đêm, Thức ăn; alert info về phí đón trễ. | `services[]` (`name`, `isDone`, `doneAt`, `note`); giá: `GET /services?species=&sizeGroup=` theo `serviceId` (Suy ra); `plannedCheckIn`, `plannedCheckOut` |
| 5 | Ảnh trước và sau (spa) | Chưa có ảnh: “Nhân viên spa sẽ chụp ảnh bé trước khi bắt đầu và sau khi hoàn tất. Ảnh hiện ở đây.” Có ảnh: lưới ảnh 4:3, nhãn “Trước”/“Sau”, thời gian chụp. Bấm ảnh mở xem lớn **(Đề xuất)**. | `GET /appointments/{id}/photos` → `kind`, `url`, `uploadedAt` |
| 6 | Thông tin | Thú cưng; Nhóm áp dụng (“Nhỏ, chờ xác nhận lên Vừa” / “Vừa (cân thực tế 11,2 kg)”); Nhân viên spa (tên hoặc “Cửa hàng xếp khi xác nhận”); Khung giờ / Chuồng. | `sizeGroup`, `actualWeightKg`, `staff[].fullName` |
| 7 | Thanh toán | Trước hoàn tất (spa): “Tạm tính” + “Khoản thanh toán phát sinh khi lịch hẹn hoàn tất…”. Có khoản: tên khoản, số tiền lớn, badge Chưa/Đã thanh toán; spa `Unpaid` + lịch `Completed`: nút “Thanh toán trực tuyến” → CW-09·D3 + “Hoặc thanh toán tại quầy…”; `Paid`: Phương thức, Thời điểm. Lưu trú: Tiền lưu trú (công thức), Phí trả muộn (“Chưa phát sinh” nếu chưa có), “Lịch lưu trú chỉ thanh toán tại quầy.” | `GET /appointments/{id}/payments` → `kind`, `amount`, `status`, `method`, `paidAt` |
| 8 | Đổi hoặc hủy | Lịch `Pending`/`Confirmed`: chú thích hạn tự đổi/hủy (G-03), nút “Đổi lịch” (phụ) → CW-10, “Hủy lịch” (danger) → CW-09·D1. Quá hạn (biết qua 409) hoặc lịch đã tiếp nhận trở đi: 2 nút xám + lý do “Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline 1900 6868 để được hỗ trợ.” Lịch đã hủy/hoàn tất: ẩn khối; lịch hủy hiện thêm alert “Lịch hẹn đã hủy lúc … Lý do: …” và nút “Đặt lại lịch cho <tên>” → CW-06 `?petId=`. | `status`, `cancelReason`, `cancelledAt` |
| 9 | Kết quả thanh toán | Khi `?payment=return`: thẻ xanh “Thanh toán thành công – Cửa hàng đã nhận … qua <cổng> lúc …” + nút “Về lịch hẹn của tôi”; hoặc thẻ đỏ “Thanh toán chưa thành công – Cổng thanh toán chưa xác nhận giao dịch. Khoản thanh toán vẫn là Chưa thanh toán, bạn chưa bị trừ tiền…” + nút “Thử lại” → CW-09·D3. | `GET /appointments/{id}/payments` (UF-11) |

**Hộp thoại**
- **CW-09·D1 Hủy lịch hẹn này?** “Bạn đang trong thời hạn tự hủy nên không mất phí.”; “Lịch chuyển sang Đã hủy với lý do khách hàng chủ động hủy. Thao tác không hoàn tác được…”. Nút “Giữ lịch”, “Hủy lịch hẹn” (danger đặc) → `POST /appointments/{id}/cancel` (không body) → 200 → toast “Đã hủy lịch hẹn”, tải lại trang.
- **CW-09·D2 Từ chối chi phí mới?** “Lịch spa <mã> của <tên> sẽ bị hủy.”; “Lịch chuyển sang Đã hủy với lý do không xác nhận chi phí mới…”. Nút “Quay lại”, “Từ chối và hủy lịch” → `POST …/cost-confirmation/respond` `{ accept: false }`.
- **CW-09·D3 Thanh toán trực tuyến:** số tiền; chọn cổng VNPAY (“Thẻ ngân hàng, ví VNPAY, QR”) hoặc Ví MoMo; chú thích “Bạn sẽ được chuyển sang cổng thanh toán (môi trường thử nghiệm)…”. Nút “Để sau”, “Tiếp tục đến cổng thanh toán” → `POST /payments/{paymentId}/online` `{ gateway }` → `window.location.assign(paymentUrl)`.

**Trạng thái:** đếm ngược về 00:00 → tải lại `GET /appointments/{id}` (không tự hủy ở web, SA 6.6); làm mới chi tiết định kỳ 30 giây khi lịch đang `Received`/`InProgress` **(Đề xuất)**; `?payment=return` → hỏi lại khoản thanh toán tối đa 5 lần, cách 2 giây, đến khi `Paid` **(Đề xuất)**.

**Hành vi:** “Đồng ý chi phí mới” → `{ accept: true }` → toast “Đã đồng ý chi phí mới <số tiền>. Nhân viên sẽ bắt đầu chăm sóc <tên>.” → tải lại.

**Mã lỗi tại màn:** 409 `CHANGE_WINDOW_CLOSED` (khi hủy) → chuyển vùng 8 sang trạng thái quá hạn; 409 `COST_CONFIRMATION_EXPIRED` hoặc 404 khi phản hồi → `ErrorAlert` “Yêu cầu xác nhận đã hết hạn.” **(Đề xuất)** + tải lại; 409 `PAYMENT_NOT_DUE` khi thanh toán → `ErrorAlert` trong hộp thoại, tải lại khoản; 403/404 → `ForbiddenState` / `NotFoundState`.

### CW-10 – Đổi lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen/[appointmentId]/doi-lich` |
| Vai trò | KH, lịch `Pending` hoặc `Confirmed`, còn trong hạn |
| Mục đích | Đổi thú cưng, dịch vụ, ngày giờ (spa) hoặc thời điểm nhận/trả (lưu trú); lịch quay về Chờ xác nhận. |
| Tham chiếu | UC-14 · FR-CHG-01 · BR-08, BR-13, BR-21, BR-26 · UF-06 |
| Wireframe | `wireframes/CW-10-doi-lich-spa.png`, `wireframes/CW-10-doi-lich-luu-tru.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | Đường dẫn “Lịch hẹn của tôi › <mã> › Đổi lịch”; “Đổi lịch hẹn”, “… Lịch đổi xong quay về Chờ xác nhận để cửa hàng duyệt lại.” | – |
| 2 | Lịch hiện tại | Ô nền Mist: hình, “Lịch hiện tại”, tóm tắt, badge trạng thái. | `GET /appointments/{appointmentId}` |
| 3 | Thú cưng và dịch vụ (spa) | Ô chọn thú cưng; lưới thẻ dịch vụ chọn nhiều (đã chọn sẵn dịch vụ hiện tại). | `GET /pets`, `GET /services?species=&sizeGroup=` |
| 4 | Ngày và khung giờ mới (spa) | Như CW-06 vùng 5 + 6. | `GET /spa/slots` |
| 5 | Sau khi đổi (cột phải) | Thú cưng, Thời gian, Dịch vụ (số dịch vụ, tổng phút) / Nhận, Trả, Số đêm; Tạm tính hoặc Tiền lưu trú + “Tính lại khi cửa hàng duyệt”; alert cảnh báo “Lịch sẽ về Chờ xác nhận để cửa hàng duyệt lại nhân viên (và chuồng)…”. Nút “Gửi yêu cầu đổi lịch” (chính), “Giữ lịch hiện tại” → CW-09. | Tính ở web chỉ để xem |
| 6 | Thời gian mới (lưu trú) | Ngày nhận, Giờ nhận, Ngày trả, Giờ trả + kết quả còn chỗ (như CW-07 vùng 3). | `GET /hotel/availability` |

**Hành vi:** gửi `PUT /appointments/{id}` – spa `{ slotStart, petId, serviceIds }`, lưu trú `{ plannedCheckIn, plannedCheckOut, petId }` → 200 (`status` = `Pending`) → CW-09, toast “Đã gửi yêu cầu đổi lịch. Lịch đang chờ cửa hàng duyệt lại.” Nút gửi bị khóa khi chưa có thay đổi **(Đề xuất)**.

**Mã lỗi tại màn:** 409 `CHANGE_WINDOW_CLOSED` → về CW-09 với trạng thái quá hạn + `ErrorAlert`; 409 `SLOT_FULL` / `NO_CAPACITY` → như CW-06 / CW-07; 409 `INVALID_TRANSITION` → `ErrorAlert` + tải lại.

### CW-11 – Lịch sử dịch vụ

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-su` (`?petId=`) |
| Vai trò | KH |
| Mục đích | Xem các lịch đã hoàn tất của từng thú cưng. |
| Tham chiếu | UC-11 · FR-BOOK-05 · BR-16 |
| Wireframe | `wireframes/CW-11-lich-su.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề + chọn thú cưng | “Lịch sử dịch vụ”, “Các lịch hẹn đã hoàn tất của từng bé.”; nhóm nút theo thú cưng (hình + tên). | `GET /pets` |
| 2 | Thẻ lịch spa | Cột trái ngày + khung giờ; giữa: loại, mã, badge Hoàn tất, dịch vụ, “Nhân viên <tên>. Đã thanh toán <số tiền>, <phương thức>.”; phải: ảnh nhỏ Trước/Sau. | `GET /appointments?status=Completed&petId=&page=&pageSize=10`; từng thẻ: `GET /appointments/{id}` (dịch vụ, nhân viên), `GET /appointments/{id}/payments`, `GET /appointments/{id}/photos` – tải khi thẻ hiện ra (G-05) |
| 3 | Thẻ lịch lưu trú | Ngày trả + số đêm; “Nhận …, trả …”; tiền lưu trú, phương thức, phí trả muộn. | Như trên (không gọi ảnh) |

**Trạng thái:** rỗng → “<tên> chưa có lịch hẹn hoàn tất.” **(Đề xuất)**; “Xem thêm” tải trang kế tiếp.

### CW-12 – Thông báo

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thong-bao` |
| Vai trò | KH |
| Mục đích | Xem thông báo nghiệp vụ gửi cho mình. |
| Tham chiếu | UC-34 · FR-NOT-01 → 06 |
| Wireframe | `wireframes/CW-12-thong-bao.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Thông báo”, “Cập nhật về lịch hẹn của bạn.” | – |
| 2 | Tab | Tất cả · Chưa đọc (kèm số). | `unread`; lọc ở web trên trang đã tải (G-19) |
| 3 | Thông báo chưa đọc | Nền sáng hơn, chấm Lagoon sau tiêu đề; ô biểu tượng theo `type` (mục 2.4); tiêu đề, nội dung, thời gian (“09:03”, “Hôm qua, 21:12”, “04/10, 08:30”); `CostConfirmation` có liên kết “Xem và xác nhận” → CW-09. | `GET /notifications?page=&pageSize=20` → `items[]` (`type`, `message`, `isRead`, `createdAt`, `appointmentId`) |
| 4 | Thông báo đã đọc | Như 3, không có chấm. | – |

**Hành vi:** bấm một thông báo chưa đọc → `POST /notifications/{id}/read` (không chờ kết quả) và mở CW-09 nếu có `appointmentId`; cập nhật số trên chuông. Tiêu đề hiển thị lấy từ `type` + `message`: API chỉ có `message` (≤ 500 ký tự) nên dòng đậm là nhãn theo `type` **(Đề xuất)**, dòng dưới là `message`.

**Trạng thái:** rỗng → “Chưa có thông báo nào.” **(Đề xuất)**; cuối danh sách có “Xem thêm”.

### CW-13 – Hồ sơ cá nhân

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/ho-so` |
| Vai trò | KH |
| Mục đích | Xem, sửa họ tên, số điện thoại (= tên đăng nhập), email. |
| Tham chiếu | UC-03 · FR-ACC-03 · BR-16 · X-02 |
| Wireframe | `wireframes/CW-13-ho-so.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Thông tin của bạn | Họ tên*, Số điện thoại* (gợi ý “Cũng là tên đăng nhập. Đổi số sẽ đổi luôn tên đăng nhập.”), Email (không bắt buộc); nút “Hủy bỏ” (khôi phục giá trị), “Lưu thay đổi”. | `GET /me` → `fullName`, `phone`, `email`; `PUT /me` `{ fullName, phone, email }` |
| 2 | Tóm tắt tài khoản | Avatar, họ tên, “Khách hàng từ …” (G-04); Thú cưng “<n> hồ sơ”; Tự đặt lịch trực tuyến: thẻ “Đang được phép” / “Bị khóa” (G-04); chú thích quy tắc khóa. | `GET /pets` → `total` |
| 3 | Đăng xuất | Nút phụ “Đăng xuất”. | Đăng xuất (User-Flows 4.2) |

**Hành vi:** lưu thành công → toast “Đã lưu thông tin cá nhân”, tải lại `GET /me` (tên trên thanh trên cập nhật). Đổi số điện thoại không làm mất phiên.

**Mã lỗi tại màn:** 409 `DUPLICATE_CONTACT` → lỗi dưới ô Số điện thoại “Thông tin liên hệ này đã được sử dụng.”; 400 → lỗi dưới trường hoặc `ErrorAlert`.

---

## 4. Web nhân viên

Màn có cột “Vai trò” chỉ LT hoặc chỉ NVS: vai trò còn lại mở bằng đường dẫn trực tiếp thì thấy `ForbiddenState` (User-Flows 4.2). Nút trên web nhân viên cao tối thiểu 44px.

### SW-01 – Đăng nhập web nhân viên

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dang-nhap` (`?next=`) (không khung) |
| Vai trò | Ẩn danh |
| Tham chiếu | UC-02 · FR-ACC-02 · Auth 3.3, 3.6 |
| Wireframe | `wireframes/SW-01-dang-nhap.png` (trạng thái sai thông tin) |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khối giới thiệu (nền Lagoon đậm) | “Bắt đầu ca làm việc.” + “Lễ tân tiếp nhận, thu tiền, trả bé. Nhân viên spa xem lịch được phân công…” | Tĩnh |
| 2 | Thông báo lỗi | “Thông tin đăng nhập không đúng.” (sai thông tin hoặc bị vô hiệu hóa); 429 dạng cảnh báo như CW-02. | `POST /auth/login` |
| 3 | Form | “Đăng nhập”, “Tài khoản do quản lý cửa hàng cấp.”; Số điện thoại, Mật khẩu; nút “Đăng nhập”; “Không đăng nhập được? Liên hệ quản lý cửa hàng.” | `POST /auth/login` → `GET /me` (`role` = `Staff`, `staffRole`) |

**Hành vi:** như CW-02; `role` khác `Staff` → “Tài khoản không có quyền truy cập web này”. Thành công → SW-02.

### SW-02 – Lịch hẹn (LT: cả cửa hàng · NVS: được phân công)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen` (`?date=YYYY-MM-DD`, mặc định hôm nay); `/` chuyển về đây |
| Vai trò | LT, NVS (backend lọc theo phạm vi) |
| Mục đích | LT: điều phối lịch trong ngày tại quầy. NVS: xem lịch được phân công. |
| Tham chiếu | UC-11 · FR-EXE-01 · BR-16 · UF-03, UF-05 |
| Wireframe | `wireframes/SW-02-lich-hen-le-tan.png`, `wireframes/SW-02-lich-hen-nhan-vien-spa.png` |

**Lễ tân**

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Lịch hẹn hôm nay”, “<thứ> dd/MM/yyyy, toàn cửa hàng”; ô chọn ngày; nút chính “Đặt lịch thay khách” → SW-06. | `?date` |
| 2 | Lọc nhanh | Chip kèm số: Tất cả · Chờ tiếp nhận (`Confirmed` có giờ hẹn/giờ nhận trong ngày) · Đang ở cửa hàng (`Received`, `InProgress`) · Lưu trú nhận, trả (lịch `Hotel` có giờ nhận hoặc giờ trả trong ngày) · Chờ xác nhận (`Pending`). | Lọc ở web trên danh sách trong ngày (Suy ra) |
| 3 | Bảng lịch | Cột: Giờ (spa: giờ bắt đầu; lưu trú: giờ + “nhận”/“trả”) · Thú cưng (hình, tên, loài + giống) · Khách hàng (tên, thẻ “Có tài khoản”/“Khách vãng lai” – G-05) · Loại (Spa / Lưu trú, n đêm) · Nhân viên / chuồng (“Chờ quản lý xếp” khi chưa có) · Trạng thái (badge + dòng phụ: “Giữ chỗ đến HH:mm” – G-03, “Chưa thu tiền lưu trú”) · Thao tác. Thao tác theo trạng thái: lịch `Confirmed` → “Tiếp nhận” (phụ) → SW-07 `?appointmentId=`; lịch `InStay` trả hôm nay → “Trả thú cưng” → SW-10; lịch spa `Completed` còn khoản chưa thu → “Thu tiền” → SW-09 **(Suy ra)**; còn lại → “Xem” → SW-03. | `GET /appointments?date=&page=1&pageSize=100` → `items[]` (`slotStart`, `plannedCheckIn`, `plannedCheckOut`, `petName`, `petId`, `customerName`, `type`, `status`, `cageId`); mã chuồng: `GET /cages` (tra theo `cageId`); hình/giống: `GET /pets/{petId}` (bộ đệm); nhân viên: G-05 |

**Nhân viên spa**

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 4 | Tiêu đề | “Lịch được phân công cho bạn”, “<thứ> dd/MM/yyyy.” (ca làm hôm nay không hiển thị – G-18). | – |
| 5 | Hôm nay | Phiếu hẹn: giờ bắt đầu – kết thúc; tên thú cưng + loài, giống, nhóm; dịch vụ; thẻ “Chờ khách xác nhận chi phí mới” (Apricot) / “Chờ lễ tân tiếp nhận” / ghi chú hồ sơ (ví dụ “Dị ứng sữa tắm có mùi”); badge; nút “Mở” (lịch `Received`/`InProgress` → SW-11) hoặc “Xem” (→ SW-03). | `GET /appointments?date=<hôm nay>`; từng phiếu: `GET /appointments/{id}` (`services[]`, `pendingCostConfirmation`), `GET /pets/{petId}` (`notes`) |
| 6 | Sắp tới | Phiếu hẹn các ngày sau (rút gọn). | `GET /appointments?status=Confirmed&page=1&pageSize=20` → lọc ngày sau hôm nay ở web (G-06) |

**Trạng thái:** rỗng LT → “Không có lịch hẹn trong ngày này.”; rỗng NVS → “Hôm nay bạn chưa được phân công lịch nào.” **(Đề xuất)**. Làm mới danh sách 60 giây/lần **(Đề xuất)**.

### SW-03 – Chi tiết lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen/[appointmentId]` |
| Vai trò | LT (cả cửa hàng), NVS (lịch được phân công) |
| Mục đích | Xem đủ thông tin một lịch; đi tới thao tác phù hợp vai trò. |
| Tham chiếu | UC-06, UC-11, UC-25 · FR-PET-02, FR-PAY-04 · BR-16 |
| Wireframe | `wireframes/SW-03-chi-tiet-le-tan.png`, `wireframes/SW-03-chi-tiet-nhan-vien-spa.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đầu trang + thao tác chính | Đường dẫn “Lịch hẹn › <mã>”; hình, “Lịch spa của <tên>” / “Lịch lưu trú của <tên>”, badge, mã + thời gian (+ “Giữ chỗ đến …” – G-03). Nút chính theo vai trò và trạng thái: LT `Confirmed` → “Tiếp nhận thú cưng” → SW-07; LT `InStay` → “Trả thú cưng” → SW-10; NVS `Received`/`InProgress` → “Mở màn hình thực hiện” → SW-11; NVS `Confirmed` → nút khóa + lý do “Chờ lễ tân tiếp nhận thú cưng.” | `GET /appointments/{appointmentId}` |
| 2 | Vòng đời | Như CW-09 vùng 2. | `status` |
| 3 | Hồ sơ thú cưng | Loài, giống; Cân nặng khai báo; Chiều cao vai; Nhóm kích cỡ; Tính cách; Đặc điểm lông; Ghi chú. LT: liên kết “Sửa hồ sơ” → SW-05; NVS: thẻ “Chỉ xem”. | `GET /pets/{petId}` |
| 4 | Dịch vụ | Spa: danh sách dịch vụ (trạng thái xong, thời lượng, giá). Lưu trú: chuồng, nhận, trả dự kiến, số đêm. | `services[]`; giá: `GET /services?species=&sizeGroup=` |
| 5 | Khách hàng | Avatar, tên; số điện thoại chỉ hiện với LT (G-05); thẻ có tài khoản / vãng lai (G-05). | `customerName` |
| 6 | Phân công | Nhân viên spa (tên), Số nhân viên cần, Nhân viên rảnh lại (G-05: chưa có `busyUntil`, tạm hiện giờ kết thúc `slotEnd`). | `staff[]`, `staffRequired`, `slotEnd` |
| 7 | Thanh toán | Trước hoàn tất: tạm tính + “Khoản thanh toán phát sinh khi lịch hẹn hoàn tất.”; có khoản: như CW-09 vùng 7 (không có nút thanh toán trực tuyến). | `GET /appointments/{id}/payments` |

**Mã lỗi tại màn:** 403 (NVS mở lịch không được phân công) → `ForbiddenState`; 404 → `NotFoundState`.

### SW-04 – Khách hàng: tìm, ghi nhận khách vãng lai

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/khach-hang` (`?search=`) |
| Vai trò | LT |
| Mục đích | Tìm khách theo số điện thoại; ghi nhận khách vãng lai; chuyển sang hồ sơ thú cưng hoặc đặt lịch thay. |
| Tham chiếu | UC-04 · FR-ACC-04 · BR-01 · UF-03 |
| Wireframe | `wireframes/SW-04-khach-hang-tim-thay.png`, `wireframes/SW-04-khach-hang-vang-lai.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Ô tìm | Ô tìm cao 48px (biểu tượng kính lúp), nút “Tìm khách”. Enter = tìm. | `GET /customers?search=` |
| 2 | Kết quả (tìm thấy) | Mỗi khách một thẻ: avatar, họ tên, thẻ “Có tài khoản” (G-05), thẻ “Đang được tự đặt lịch” / “Bị khóa tự đặt lịch”, số điện thoại, email; nút “Thêm thú cưng” → SW-05, “Đặt lịch thay” → SW-06; khối “Thú cưng” (thẻ bấm được → SW-05 sửa); khối “Lịch hẹn gần đây” (phiếu rút gọn). | `items[]` (`customerId`, `fullName`, `phone`, `email`, `isBookingLocked`); `GET /pets?customerId=`; lịch gần đây: `GET /appointments?petId=` theo từng thú cưng, lấy 5 lịch mới nhất (G-06) |
| 3 | Không tìm thấy | Alert neutral “Không tìm thấy khách nào với số <số>. Bạn có thể ghi nhận khách vãng lai bên dưới.” | `items` rỗng |
| 4 | Ghi nhận khách vãng lai | Họ tên*, Số điện thoại* (điền sẵn từ ô tìm); chú thích “Khách vãng lai không có tài khoản đăng nhập và không nhận thông báo trên web…”; nút “Hủy bỏ”, “Lưu và tạo hồ sơ thú cưng”. | `POST /customers/walk-in` `{ fullName, phone }` → 201 `{ customerId }` |

**Hành vi:** chọn khách (bấm thẻ, “Thêm thú cưng”, “Đặt lịch thay” hoặc lưu khách vãng lai) → đặt **khách đang phục vụ** (giữ trong phiên làm việc, Frontend-Architecture mục 5) rồi chuyển màn. Lưu khách vãng lai → toast “Đã ghi nhận khách vãng lai <tên>” → SW-05 `/khach-hang/{customerId}/thu-cung/them`.

**Mã lỗi tại màn:** 409 `DUPLICATE_CONTACT` → lỗi dưới ô Số điện thoại “Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.” + thẻ khách trùng (tìm lại theo số) với nút “Chọn khách này”; nút lưu bị khóa.

### SW-05 – Hồ sơ thú cưng (lễ tân)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/khach-hang/[customerId]/thu-cung/them`, `/khach-hang/[customerId]/thu-cung/[petId]` |
| Vai trò | LT |
| Mục đích | Tạo hoặc sửa hồ sơ thú cưng theo thông tin khách khai tại quầy. |
| Tham chiếu | UC-05, UC-06 · FR-PET-01, 02, 04 · BR-19 |
| Wireframe | `wireframes/SW-05-ho-so-thu-cung.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khách đang phục vụ | Đường dẫn “Khách hàng › <tên khách> › Thêm thú cưng / <tên thú cưng>”; dải nền Mist: tên, số điện thoại, thẻ có tài khoản / vãng lai. | Khách đang phục vụ (G-14) |
| 2 – 5 | Form | Giống CW-05 vùng 2 – 5. Chọn “Khó tính, dữ” → alert cảnh báo “Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn. Hãy báo khách điều này khi chọn giờ.” Sửa hồ sơ: gợi ý dưới Cân nặng “Cân nặng thực tế khi tiếp nhận sẽ cập nhật vào đây.” | Sửa: `GET /pets/{petId}` |
| 6 | Nút | “Hủy bỏ” → SW-04; tạo mới: “Lưu và đặt lịch” → SW-06 với thú cưng vừa tạo; sửa: “Lưu hồ sơ”. | `POST /pets` `{ …, customerId }` / `PUT /pets/{petId}` |
| 7 | Nhóm kích cỡ dự kiến | Như CW-05 vùng 7; chú thích thêm “Chỉ khách hàng mới gỡ được hồ sơ thú cưng.” | Tính ở web chỉ để xem |

**Kiểm tra dữ liệu nhập, mã lỗi:** như CW-05. LT không có nút gỡ hồ sơ (Auth 4).

### SW-06 – Đặt lịch thay khách

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dat-lich` (`?customerId=&petId=&type=Spa\|Hotel`) |
| Vai trò | LT |
| Mục đích | Đặt lịch spa hoặc lưu trú cho khách đến quầy hoặc gọi điện; không áp dụng khóa tự đặt lịch. |
| Tham chiếu | UC-10, UC-28 · FR-BOOK-01 → 03, FR-HTL-04 · BR-01, BR-15 · UF-03 |
| Wireframe | `wireframes/SW-06-dat-lich-thay-spa.png`, `wireframes/SW-06-dat-lich-thay-luu-tru.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khách đang phục vụ | Avatar, tên, số điện thoại, thẻ vãng lai/có tài khoản; nút “Đổi khách” → SW-04. Chưa chọn khách → `EmptyState` “Chưa chọn khách hàng” + nút “Tìm khách” **(Đề xuất)**. | Khách đang phục vụ (G-14) |
| 2 | Tab loại lịch | Lịch spa · Lưu trú. | `?type` |
| 3 | Thú cưng | Thẻ chọn thú cưng của khách (tên, loài, giống, cân nặng, nhóm, tính cách); liên kết “Thêm thú cưng” → SW-05. | `GET /pets?customerId=` |
| 4 | Dịch vụ (spa) | Như CW-06 vùng 3, dạng lưới 2 cột. | `GET /services?species=&sizeGroup=` |
| 5 | Ngày và khung giờ (spa) | Như CW-06 vùng 5 + 6; alert info giải thích số nhân viên cần (ví dụ “Bắp khó tính nên lịch cần 2 nhân viên trong 75 phút…”). | `GET /spa/slots` |
| 6 | Lưu ý khách vãng lai | Alert neutral “Khách vãng lai không nhận thông báo trên web. Hãy báo khách giờ hẹn và nói rõ lịch đang chờ cửa hàng xác nhận.” (chỉ hiện với khách vãng lai **(Đề xuất)**). | – |
| 7 | Tóm tắt (cột phải) | Thú cưng; spa: dịch vụ, Thời gian, Số nhân viên cần (“2 (bé khó tính)”), Tạm tính; lưu trú: Nhận, Trả, Số đêm, Tiền lưu trú + công thức. Nút “Tạo lịch hẹn spa” / “Tạo lịch lưu trú”; chú thích “Lịch tạo ra ở trạng thái Chờ xác nhận.” | Spa: `GET /spa/slots`; lưu trú: `GET /hotel/availability`, `GET /hotel/pricing` |
| 8 | Thời gian gửi và đón (lưu trú) | Như CW-07 vùng 3; chú thích “Lưu trú không kèm dịch vụ spa…”. | `GET /hotel/availability` |

**Hành vi:** spa `POST /appointments/spa` `{ petId, serviceIds, slotStart, customerId }`; lưu trú `POST /appointments/hotel` `{ petId, plannedCheckIn, plannedCheckOut, customerId }` → 201 → SW-02, toast “Đã tạo lịch spa <mã>, đang chờ quản lý xác nhận”.

**Mã lỗi tại màn:** 409 `SLOT_FULL` / `NO_CAPACITY` như CW-06 / CW-07; 400 → `ErrorAlert`. Không có `BOOKING_LOCKED` khi lễ tân đặt thay.

### SW-07 – Tiếp nhận và đối chiếu cân nặng

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/tiep-nhan` (`?appointmentId=`) |
| Vai trò | LT |
| Mục đích | Tiếp nhận thú cưng, ghi cân nặng thực tế, xử lý kết quả đối chiếu; với lưu trú: đối chiếu → thu tiền → đưa vào chuồng. |
| Tham chiếu | UC-16, 17, 30, 31 · FR-EXE-02, 10, 11, FR-HTL-07 · BR-05, BR-07, BR-08, BR-23 · UF-03, UF-10 |
| Wireframe | `wireframes/SW-07-tiep-nhan-nhap-can.png`, `…-cho-xac-nhan.png`, `…-luu-tru.png`, `wireframes/SW-07-d1-ghi-nhan-phan-hoi.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Lịch hẹn hôm nay | Danh sách phiếu rút gọn (giờ + Spa/Lưu trú/Trả, hình, tên thú cưng, tên khách, badge); phiếu đang chọn viền Lagoon. Bấm phiếu → `?appointmentId=`. | `GET /appointments?date=<hôm nay>&page=1&pageSize=100` |
| 2 | Thẻ tiếp nhận spa – đầu thẻ | Hình, “<tên>, <loài> <giống>”, “<mã>. Spa HH:mm – HH:mm. Nhân viên phụ trách: <tên>”, badge. | `GET /appointments/{id}`, `GET /pets/{petId}` |
| 3 | Thông tin đối chiếu | 3 ô: Khách hàng (tên, số điện thoại – G-05); Cân nặng khai báo (“9,0 kg, nhóm Nhỏ”, “Chiều cao 30 cm giữ theo hồ sơ”); Dịch vụ + tạm tính. | `customerName`; `weightKg`, `heightCm`, `sizeGroup` |
| 4 | Cân nặng thực tế (kg)* | Ô số lớn (cao 52px, chữ 20px), hậu tố “kg”. | `actualWeightKg` |
| 5 | Kết quả đối chiếu | Trước khi gửi: “Hệ thống đối chiếu với hồ sơ ngay khi bạn xác nhận tiếp nhận.” + “Giữ chỗ đến HH:mm, còn n phút.” (G-03). Sau khi gửi: `OK` → alert success “Trong ngưỡng dung sai, chi phí không đổi…”; `PRICE_DECREASED` → alert info “Cân nặng giảm, xuống nhóm <…>… Chi phí giảm từ <oldAmount> xuống <newAmount>. Khung giờ giữ nguyên.” | Phản hồi `POST /appointments/{id}/check-in` → `weightCheck` (`result`, `newSizeGroup`, `oldAmount`, `newAmount`) |
| 6 | Chân thẻ | “Quay lại lịch hẹn” → SW-02; nút chính theo bước: “Xác nhận tiếp nhận” / “Ghi nhận phản hồi của khách” (khi chờ xác nhận) → SW-07·D1 / “Tiếp nhận lịch tiếp theo”. | – |
| 7 | Cần khách xác nhận | Alert cảnh báo “Tăng nhóm kích cỡ: Nhỏ → Vừa”, “Chênh <x> kg, vượt ngưỡng dung sai… Chi phí tăng từ <oldAmount> lên <newAmount>. Đã gửi yêu cầu xác nhận cho khách” + đồng hồ đếm ngược; chú thích hậu quả đồng ý / từ chối / quá hạn. Hiện cả khi mở lại lịch đang chờ. | `weightCheck` (`NEEDS_CONFIRMATION`, `expiresAt`) hoặc `pendingCostConfirmation` |
| 8 | Thẻ tiếp nhận lưu trú – đầu thẻ | “<tên>, <loài> <giống>”, “<mã>. Lưu trú dd/MM HH:mm → dd/MM HH:mm. Chuồng <mã>”, badge; dải khách hàng (tên, số, thẻ vãng lai). | `GET /appointments/{id}`; mã chuồng `GET /cages` |
| 9 | Bước 1 – Đối chiếu cân nặng | Chưa làm: ô Cân nặng thực tế + nút “Đối chiếu cân nặng”. Đã làm: dòng xanh “Ghi nhận cân nặng thực tế: <x> kg” + giải thích kết quả + thẻ “Đã đối chiếu”. Đang chờ xác nhận: như vùng 7. | `POST /appointments/{id}/weight-check` `{ actualWeightKg }`; đã làm khi `actualWeightKg` ≠ null |
| 10 | Bước 2 – Thu tiền lưu trú | “Thu tiền lưu trú: <số tiền>”, công thức; nút “Thu tiền” → SW-09 `?appointmentId=`; đã thu: dòng xanh “Đã thu tiền lưu trú…” + badge Đã thanh toán. | `GET /appointments/{id}/payments` → khoản `Stay` |
| 11 | Bước 3 – Đưa bé vào chuồng | “Đưa bé vào chuồng <mã>”, “Lịch chuyển sang Đang lưu trú, chuồng <mã> hiển thị đang chứa <tên>.”; nút “Xác nhận tiếp nhận” (chân thẻ) khóa với lý do “Cần thu tiền lưu trú trước khi tiếp nhận.” / “Đang chờ khách xác nhận chi phí mới.” / “Cần đối chiếu cân nặng trước.” **(Đề xuất)** cho tới khi đủ điều kiện. | `POST /appointments/{id}/check-in` (không body) |

**SW-07·D1 – Ghi nhận phản hồi của khách:** “<tên>, <mã>. Chi phí mới <newAmount> (trước <oldAmount>).”; 2 lựa chọn: “Khách đồng ý chi phí mới” (“Lịch tiếp tục, hồ sơ cập nhật <x> kg”) / “Khách từ chối” (“Lịch bị hủy, lý do không xác nhận chi phí mới”). Nhóm “Khách phản hồi qua” của UI demo không gửi lên API nên không làm (G-20). Nút “Hủy bỏ”, “Ghi nhận phản hồi” → `POST /appointments/{id}/cost-confirmation/respond` `{ accept }` → toast “Đã ghi nhận khách đồng ý chi phí mới cho <tên>” → tải lại.

**Kiểm tra dữ liệu nhập:** cân nặng là số > 0, cho phép dấu phẩy thập phân (“Vui lòng nhập cân nặng thực tế lớn hơn 0.”).

**Trạng thái:** chưa chọn lịch → khung bên phải “Chọn một lịch hẹn trong danh sách để tiếp nhận.” **(Đề xuất)**; đếm ngược hết giờ → tải lại lịch.

**Mã lỗi tại màn:** 409 `INVALID_TRANSITION` (quá giờ giữ chỗ, lịch đã bị hủy do vắng mặt hoặc đã tiếp nhận) → `ErrorAlert` + tải lại danh sách; 409 `PAYMENT_NOT_DUE` (lưu trú chưa thu tiền) → `ErrorAlert`, tô đậm bước 2; 409 `COST_CONFIRMATION_PENDING` → hiện vùng 7; 409 `COST_CONFIRMATION_EXPIRED` (D1) → `ErrorAlert` + tải lại.

### SW-08 – Tình trạng chuồng

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/chuong` |
| Vai trò | LT |
| Mục đích | Biết chuồng nào trống, chuồng nào đang chứa thú cưng của ai, khi nào trả. |
| Tham chiếu | UC-33 · FR-HTL-08 · BR-21 |
| Wireframe | `wireframes/SW-08-chuong.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Tình trạng chuồng”, “<n> chuồng đang sử dụng: <a> đang chứa, <b> trống. <c> chuồng ngừng sử dụng.” | Đếm ở web từ `GET /cages` |
| 2 | Bộ lọc | Chip loài (Tất cả loài, Chó, Mèo, Thỏ, Chuột lang); ô chọn nhóm kích cỡ; nhóm nút Tất cả / Trống / Đang chứa. | Lọc ở web |
| 3 | Lưới chuồng | Thẻ chuồng: mã (chữ lớn), nhãn Trống (nền kẻ sọc nhạt) / Đang chứa / Ngừng sử dụng (nền xám, “Không tính vào sức chứa”); “<loài>, nhóm <…>”; đang chứa: hình + tên thú cưng, “<loài>. Chủ: <tên khách>”, “Trả dự kiến HH:mm, dd/MM”. | `GET /cages?page=1&pageSize=100` → `code`, `species`, `sizeGroup`, `isActive`, `occupant` (`petName`, `customerName`, `plannedCheckOut`) |
| 4 | Chuồng trả hôm nay | Viền Apricot, chữ “Trả hôm nay HH:mm”, nút “Trả thú cưng” → SW-10 `?appointmentId=`. | `occupant.plannedCheckOut` là hôm nay; `appointmentId` tìm qua `GET /appointments?date=<hôm nay>&type=Hotel&status=InStay` theo `petId` (G-17) |

### SW-09 – Thanh toán tại quầy

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thanh-toan` (`?appointmentId=`) |
| Vai trò | LT |
| Mục đích | Ghi nhận tiền mặt hoặc chuyển khoản QR cho khoản đến hạn; chỉ “Đã thanh toán” khi nhận đủ. |
| Tham chiếu | UC-23, UC-25 · FR-PAY-01, 02 · BR-07, BR-09, BR-17, BR-22 · FR-EXE-10 |
| Wireframe | `wireframes/SW-09-thanh-toan-tien-mat.png`, `wireframes/SW-09-thanh-toan-qr.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khoản cần thu | “Khoản cần thu” + số khoản; phiếu rút gọn: cuống = số tiền + loại (Spa / Lưu trú / Phí trễ), tên thú cưng, mô tả (“Lịch spa đã hoàn tất, <mã>”, “Tiền lưu trú, nhận HH:mm hôm nay”, “Phí trả muộn, <mã>”). | Lịch trong ngày đang có khoản đến hạn: spa `Completed`, lưu trú `Confirmed`, lưu trú `InStay`; với từng lịch `GET /appointments/{id}/payments` → giữ khoản `Unpaid` (G-07) |
| 2 | Đầu thẻ khoản | “<tên>: <loại khoản>”, “<mã>. <tên khách>, <có tài khoản / vãng lai>”, badge Chưa thanh toán. | Khoản đang chọn |
| 3 | Cách tính | Lưu trú: Lịch hẹn (trạng thái), Nhóm áp dụng (“…đã đối chiếu <x> kg”), Cách tính “n đêm × (giá + thức ăn)”. Spa: thời điểm hoàn tất, nhóm áp dụng, giá từng dịch vụ. Phí trễ: Trả dự kiến, Trả thực tế (trễ n phút). | `GET /appointments/{id}`, `GET /hotel/pricing`, `GET /services?species=&sizeGroup=` (chỉ để giải thích; số tiền thu là `amount`) |
| 4 | Số tiền phải trả | Chữ 28px đậm. | `amount` |
| 5 | Phương thức | Nhóm nút: Tiền mặt · Chuyển khoản QR. | `method`: `Cash` \| `BankQR` |
| 6 | Tiền mặt | Số tiền khách đưa (hậu tố “đ”), Tiền thối lại (chỉ đọc, tính ở web). Thiếu tiền: lỗi dưới ô “Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.” + ô “Còn thiếu” chữ đỏ; nút xác nhận khóa. | `receivedAmount` |
| 7 | Chân thẻ | “Người xác nhận: <tên LT>”; nút chính “Xác nhận đã thanh toán”. | `GET /me`; `POST /payments/{paymentId}/counter` `{ method, receivedAmount }` |
| 8 | Chuyển khoản QR | Mã QR + Ngân hàng, Số tài khoản, Nội dung (“LH<mã>”) (G-16); Số tiền đã nhận; ô xác nhận “Đã kiểm tra tiền vào tài khoản cửa hàng” (bắt buộc tích mới bật nút xác nhận **(Đề xuất)**). | `receivedAmount` |

**Hành vi:** thành công → toast “Đã ghi nhận thanh toán <số tiền>”; quay về nơi gọi: tiền lưu trú → SW-07 `?appointmentId=`, phí trễ → SW-10 `?appointmentId=`, spa → SW-02. Không gửi `amount`.

**Trạng thái:** không có khoản nào → “Không có khoản cần thu.” **(Đề xuất)**.

**Mã lỗi tại màn:** 409 `AMOUNT_MISMATCH` → lỗi dưới ô số tiền; 409 `PAYMENT_NOT_DUE` → `ErrorAlert` “Khoản này chưa đến thời điểm thu.” **(Đề xuất)** + tải lại; 409 `COST_CONFIRMATION_PENDING` (tiền lưu trú) → `ErrorAlert` “Đang chờ khách xác nhận chi phí mới, chưa thu tiền lưu trú.” **(Đề xuất)**.

### SW-10 – Trả thú cưng lưu trú

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/tra-thu-cung` (`?appointmentId=`) |
| Vai trò | LT |
| Mục đích | Ghi nhận khách đón bé, thu phí trả muộn nếu có, hoàn tất lịch và giải phóng chuồng. |
| Tham chiếu | UC-32 · FR-HTL-09 · BR-07, BR-22 · UF-03 |
| Wireframe | `wireframes/SW-10-tra-thu-cung.png` (đón trễ 75 phút) |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đầu thẻ | Hình, “<tên>, <loài> <giống>”, “<mã>. Chủ: <tên khách>”, badge Đang lưu trú. | `GET /appointments/{id}` |
| 2 | Thông tin lưu trú | 3 ô: Chuồng (“B1, mèo nhóm Vừa”); Nhận; Trả dự kiến. | `cageId` → `GET /cages`; `plannedCheckIn`, `plannedCheckOut` |
| 3 | Thời điểm trả thực tế | Ngày, giờ hiện tại (chỉ đọc, cập nhật mỗi phút): API không nhận thời điểm trả, backend ghi lúc gọi (G-12). | Đồng hồ ở web |
| 4 | Ghi chú trễ | Trước khi xác nhận (ước tính ở web, chỉ để báo khách): đúng giờ/sớm → alert success “Không tính phí trả muộn – Đón sớm n phút… không hoàn tiền.”; trễ → alert cảnh báo “Trễ n phút so với giờ trả dự kiến” (số tiền phạt do backend tính, G-12). | `plannedCheckOut` |
| 5 | Thanh toán | Tiền lưu trú (số tiền, badge, “dd/MM, <phương thức>”); Phí trả muộn: “Không phát sinh” / số tiền + badge Chưa thanh toán + nút “Thu phí trả muộn” → SW-09 / đã thanh toán. | `GET /appointments/{id}/payments` (`Stay`, `LateFee`) |
| 6 | Xác nhận | Nút chính “Xác nhận trả thú cưng” (biểu tượng bàn giao); khóa khi có khoản `LateFee` chưa thanh toán, lý do “Cần thu phí trả muộn trước khi hoàn tất.”; chú thích “Sau khi xác nhận, lịch chuyển Hoàn tất và chuồng <mã> trống để nhận bé khác.” | `POST /appointments/{id}/check-out` |

**Hành vi:** 200 `{ status: Completed, lateFee? }` → toast “Đã trả <tên> cho khách. Chuồng <mã> đã trống.” → SW-08. Không có `?appointmentId=` → danh sách lịch `InStay` trả hôm nay để chọn **(Đề xuất)**.

**Mã lỗi tại màn:** 409 `PAYMENT_NOT_DUE` → tải lại khoản thanh toán, hiện khoản `LateFee` chưa thu, khóa nút xác nhận (G-12); 409 `INVALID_TRANSITION` → `ErrorAlert` + tải lại.

### SW-11 – Thực hiện dịch vụ

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen/[appointmentId]/thuc-hien` |
| Vai trò | NVS được phân công |
| Mục đích | Tải ảnh trước, bắt đầu, đánh dấu từng dịch vụ, tải ảnh sau, hoàn tất lịch spa. |
| Tham chiếu | UC-18, UC-19 · FR-EXE-03, 04, 09 · BR-05, BR-06, BR-20, BR-23 · UF-05 |
| Wireframe | `wireframes/SW-11-thuc-hien-chua-du-dieu-kien.png`, `wireframes/SW-11-thuc-hien-dang-lam.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đầu trang | Đường dẫn “Lịch hẹn › <mã>”; hình, “<tên>, <loài> <giống>”, badge; “<mã>. Khách <tên>. HH:mm – HH:mm. <nhóm / chờ xác nhận lên nhóm mới>”. | `GET /appointments/{id}` |
| 2 | Lưu ý từ hồ sơ | Alert neutral “Lưu ý từ hồ sơ: <notes>. Tính cách <…>. Lông <coatNote>.” | `GET /pets/{petId}` |
| 3 | Ảnh trước chăm sóc | Thẻ “Hợp lệ” / “Chưa hợp lệ”. Chưa có ảnh trước của lịch: alert cảnh báo (“Cần chụp ảnh mới” khi ảnh gần nhất quá hạn – G-13) + ô tải ảnh “Chụp hoặc chọn ảnh trước chăm sóc”, “Chỉ nhận tệp ảnh”, nút “Tải ảnh lên”; đang tải: thanh tiến trình. Có ảnh: ảnh 4:3 nhãn “Trước”, thời gian. | `GET /appointments/{id}/photos`; `POST /appointments/{id}/photos` (multipart `kind=Before`, `file`) – chỉ khi `Received` |
| 4 | Ảnh sau chăm sóc | Trước khi bắt đầu: ô mờ “Chưa thể tải ảnh sau – Tải được khi lịch đang thực hiện.”; đang thực hiện: ô tải “Chụp ảnh sau khi xong mọi dịch vụ”; có ảnh: ảnh nhãn “Sau”, thẻ “Đã có”. | `POST /appointments/{id}/photos` (`kind=After`) – chỉ khi `InProgress` |
| 5 | Dịch vụ – đầu thẻ | “Dịch vụ”, “<x> / <n> xong”. | `services[]` |
| 6 | Chờ xác nhận chi phí | Alert cảnh báo “Đang chờ khách xác nhận chi phí mới (Nhỏ → Vừa), còn mm:ss.” | `pendingCostConfirmation` |
| 7 | Chân thẻ – nút chính | `Received`: “Bắt đầu thực hiện” (khóa kèm từng lý do: “Cần ảnh trước chăm sóc hợp lệ.”, “Đang chờ khách xác nhận chi phí mới.”). `InProgress`: “Hoàn tất lịch hẹn” (khóa với lý do “Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.”). `Completed`: ẩn nút, chỉ xem. | `POST /appointments/{id}/start`, `POST /appointments/{id}/complete` |
| 8 | Dịch vụ đang làm | Mỗi dịch vụ: vòng tick, tên, ghi chú hồ sơ hoặc “Đang làm”; ô Ghi chú (không bắt buộc); nút “Đánh dấu xong” (khóa khi chưa `InProgress`). Đã xong: nền xanh nhạt, “Xong lúc HH:mm”, ghi chú. | `PATCH /appointments/{id}/services/{serviceId}` `{ isDone: true, note }` |

**Kiểm tra trước khi tải ảnh:** chỉ nhận `image/*` (“Chỉ chấp nhận tệp ảnh.”), tối đa 50 MB; ảnh được thu nhỏ ở web trước khi gửi (SA 3.2) **(Đề xuất: cạnh dài 1600px, JPEG chất lượng 0,8)**.

**Hành vi:** tải ảnh xong → toast “Đã tải ảnh trước chăm sóc”; đánh dấu xong → toast “Đã đánh dấu xong <dịch vụ>”; hoàn tất → toast “Đã hoàn tất <mã>. Bàn giao <tên> ra quầy.” → SW-12. Lý do khóa nút tính ở web từ dữ liệu đang có; backend vẫn kiểm tra lại (409).

**Mã lỗi tại màn:** 409 `PHOTO_REQUIRED` → hiện lý do ảnh dưới nút + tô vùng 3 hoặc 4; 409 `COST_CONFIRMATION_PENDING` → vùng 6; 409 `SERVICES_INCOMPLETE` → lý do dưới nút; 409 `INVALID_TRANSITION` → `ErrorAlert` + tải lại; 400 khi tải ảnh → lỗi trong ô tải; 403 → `ForbiddenState`.

### SW-12 – Lịch sử công việc

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-su-cong-viec` |
| Vai trò | NVS |
| Mục đích | Xem các lịch spa mình đã thực hiện. |
| Tham chiếu | UC-11 · FR-EXE-06 |
| Wireframe | `wireframes/SW-12-lich-su-cong-viec.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Lịch sử công việc”, “Các lịch spa bạn đã thực hiện.”; ô chọn tháng (G-06: tạm lọc ở web trên trang đã tải). | – |
| 2 | Bảng | Ngày · Khung giờ · Thú cưng (hình + tên) · Dịch vụ · Trạng thái (Hoàn tất) · “Xem” → SW-11 (chỉ xem). | `GET /appointments?status=Completed&page=&pageSize=20` → `slotStart`, `slotEnd`, `petName`; dịch vụ: G-05 |
| 3 | Chân bảng | “<n> lịch …” + phân trang. | `total`, `page`, `pageSize` |

### SW-13 – Thông báo (nhân viên spa)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thong-bao` |
| Vai trò | NVS |
| Mục đích | Biết lịch mới được phân công và lịch bị hủy. |
| Tham chiếu | UC-34 · FR-NOT-02, FR-NOT-04 |
| Wireframe | `wireframes/SW-13-thong-bao.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Thông báo”, “Phân công và thay đổi về lịch hẹn của bạn.” | – |
| 2 | Thông báo phân công | Biểu tượng người + dấu cộng (nền st-2), “Bạn được phân công lịch <mã>”, nội dung, thời gian; chưa đọc có chấm. | `GET /notifications` (`ConfirmedAssigned`) |
| 3 | Thông báo hủy | Biểu tượng x (nền st-6), “Lịch <mã> đã hủy”, lý do. | `Cancelled` |

**Hành vi:** như CW-12; bấm → `POST /notifications/{id}/read` và mở SW-03.

### SW-14 – Danh mục dịch vụ

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dich-vu` |
| Vai trò | LT, NVS (chỉ xem) |
| Tham chiếu | UC-09 · FR-SVC-04 |
| Wireframe | `wireframes/SW-14-dich-vu.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề + chọn loài | “Danh mục dịch vụ”, “Giá, thời lượng và số nhân viên theo loài và nhóm kích cỡ. Chỉ xem.”; nhóm nút loài. | – |
| 2 | Bảng | Như CW-03 vùng 4, mỗi ô thêm “<phút> phút, <n> nhân viên”. | `GET /services` → `pricing[].staffRequired` |

### SW-15 – Hồ sơ cá nhân (nhân viên)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/ho-so` |
| Vai trò | LT, NVS |
| Tham chiếu | UC-03 · FR-ACC-03 |
| Wireframe | `wireframes/SW-15-ho-so.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Thông tin | Họ tên* (sửa được); Số điện thoại (chỉ đọc, gợi ý “Cũng là tên đăng nhập. Quản lý cập nhật khi cần.” – G-11); Vai trò (chỉ đọc, “Do quản lý thiết lập.”); nút “Hủy bỏ”, “Lưu thay đổi”. | `GET /me` → `fullName`, `userName`, `staffRole`; `PUT /me` `{ fullName }` |
| 2 | Tóm tắt | Avatar, họ tên, nhãn vai trò (Apricot). | `GET /me` |
| 3 | Đăng xuất | Nút phụ “Đăng xuất”. | – |

---

## 5. Web quản lý

Mọi màn chỉ dành cho QL. Web quản lý ưu tiên màn hình máy tính (SA 2.4); dưới 980px thanh bên thành thanh ngang.

### MW-01 – Đăng nhập web quản lý

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dang-nhap` (`?next=`) (không khung) |
| Vai trò | Ẩn danh |
| Tham chiếu | UC-02 · FR-ACC-02 · Auth 3.3, 3.6 |
| Wireframe | `wireframes/MW-01-dang-nhap.png` (trạng thái sai thông tin) |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Khối giới thiệu (nền Lagoon 800) | “Điều hành cửa hàng, từ lịch hẹn đến chuồng và nhân viên.” + mô tả. | Tĩnh |
| 2 | Thông báo lỗi | “Thông tin đăng nhập không đúng.”; 429 dạng cảnh báo. | `POST /auth/login` |
| 3 | Form | “Đăng nhập quản lý”, “Dùng số điện thoại và mật khẩu của tài khoản quản lý.”; Số điện thoại, Mật khẩu; nút “Đăng nhập”. | `POST /auth/login` → `GET /me` (`role` = `Manager`) |

### MW-02 – Tổng quan và giám sát tiến độ

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/` |
| Mục đích | Nắm tình hình trong ngày: việc cần xử lý, tiến độ spa theo nhân viên, chuồng, khoản chưa thu. |
| Tham chiếu | UC-11 · FR-EXE-08 · UF-04 |
| Wireframe | `wireframes/MW-02-tong-quan.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Tổng quan hôm nay”, “<thứ> dd/MM/yyyy. Cập nhật lúc HH:mm.”; nút phụ “Tất cả lịch hẹn” → MW-03. | Thời điểm tải dữ liệu gần nhất |
| 2 | 4 thẻ số liệu (bấm được) | **Chờ xác nhận** (nền Apricot nhạt): tổng + “Spa a, lưu trú b. Cần bạn xử lý” → MW-04. **Lịch spa hôm nay**: tổng + “x đang làm, y đã tiếp nhận, z chờ đến” → MW-03. **Chuồng đang chứa**: “a / b” + “Nhận hôm nay x, trả hôm nay y” → MW-07. **Khoản chưa thanh toán**: số khoản + tổng tiền → MW-10. | `GET /appointments?status=Pending&type=Spa\|Hotel&pageSize=1` → `total`; `GET /appointments?type=Spa&date=<hôm nay>&pageSize=100`; `GET /cages`; `GET /payments?status=Unpaid&pageSize=100` |
| 3 | Tiến độ spa theo nhân viên | Biểu đồ thời gian 08:00 – 21:00: mỗi hàng một NVS (avatar, tên); nền sọc = ca làm; khối màu theo trạng thái (st-1…st-4) = lịch (tên thú cưng + trạng thái), bấm → MW-05; vạch nét đứt sau khối = dọn dẹp; hàng “Chưa phân công” cho lịch `Pending`; vạch dọc + nhãn giờ hiện tại, vùng đã qua tô mờ. Chú giải dưới biểu đồ. | `GET /staff` (lọc `staffRole = SpaStaff`, `isActive`); `GET /work-shifts?from=&to=` (trong ngày); lịch spa trong ngày + `GET /appointments/{id}` từng lịch để biết `staff[]` (G-05); `bufferMinutes` từ `GET /config` |
| 4 | Cần chú ý | Danh sách bấm được: lịch đang chờ khách xác nhận chi phí (hết hạn lúc …) → MW-05; lịch `Pending` cần phân công lại → MW-04; lịch lưu trú nhận hôm nay chưa thu tiền; lịch lưu trú trả hôm nay. | Suy ra từ dữ liệu vùng 2, 3 (`pendingCostConfirmation`, khoản `Stay` chưa thu); lý do “nhân viên bị vô hiệu hóa” chưa có trong API (G-08) |
| 5 | Chuồng đang chứa | Mỗi dòng: hình, “<mã chuồng>, <tên thú cưng>”, “Trả HH:mm <ngày>”; liên kết “Xem tất cả” → MW-07. | `GET /cages` → `occupant` |

**Trạng thái:** làm mới toàn màn 60 giây/lần và khi quay lại tab trình duyệt **(Đề xuất)**; lỗi một khối không làm hỏng các khối khác.

### MW-03 – Danh sách lịch hẹn

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen` (`?type=&status=&date=&page=`) |
| Mục đích | Tra cứu lịch spa và lưu trú toàn cửa hàng; đi tới xử lý hoặc chi tiết. |
| Tham chiếu | UC-11, UC-15 · FR-EXE-08, FR-CHG-03 |
| Wireframe | `wireframes/MW-03-lich-hen.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Bộ lọc | Ô tìm “Tìm mã, thú cưng, khách hàng” (G-06); Mọi loại / Spa / Lưu trú; Mọi trạng thái / 7 trạng thái; ô ngày (UI demo là khoảng ngày – G-06, tạm chọn một ngày); “<n> lịch hẹn”. | `type`, `status`, `date`; `total` |
| 2 | Bảng | Mã, loại · Thú cưng, khách hàng · Thời gian (spa: ngày + khung giờ; lưu trú: nhận → trả) · Nhân viên / chuồng (“Chưa phân công”, “Chưa gán”) · Trạng thái (+ dòng phụ: “Khách đã đổi lịch”, “Nhân viên bị vô hiệu hóa” – G-08; “Chờ khách xác nhận chi phí” chữ Apricot; lý do hủy) · Thanh toán (badge hoặc “–”) · Thao tác: `Pending` → “Xử lý” (phụ) → MW-04 `?appointmentId=`, còn lại “Xem” → MW-05. | `GET /appointments?type=&status=&date=&page=&pageSize=20` → `items[]`; mã chuồng `GET /cages`; nhân viên, thanh toán: G-05, G-07 (tạm gọi `GET /appointments/{id}/payments` cho các dòng spa `Completed` và lưu trú `Confirmed`/`InStay`/`Completed` đang hiện) |
| 3 | Chân bảng | “Hiển thị a – b trong n lịch hẹn” + phân trang (trước, các số trang, …, sau). | `page`, `pageSize`, `total` |

### MW-04 – Xử lý lịch hẹn chờ xác nhận

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/cho-xac-nhan` (`?appointmentId=&type=`) |
| Mục đích | Xác nhận lịch kèm nhân viên spa (đủ số cần) hoặc chuồng; từ chối khi không đáp ứng được. |
| Tham chiếu | UC-12, 13, 29 · FR-ASG-01 → 04, FR-HTL-05, 06 · BR-03, BR-04, BR-10, BR-21, BR-26, BR-27 · SA 2.3.3 · UF-04 |
| Wireframe | `wireframes/MW-04-cho-xac-nhan-spa.png`, `…-phan-cong-lai.png`, `…-luu-tru.png`, `wireframes/MW-04-d1-tu-choi.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Lịch hẹn chờ xác nhận”, “Spa a, lưu trú b. Xử lý theo thứ tự giờ hẹn gần nhất.”; nhóm nút Tất cả / Spa / Lưu trú. | `?type` |
| 2 | Danh sách chờ | Phiếu rút gọn sắp theo giờ hẹn gần nhất: cuống (giờ + “Hôm nay”/“T4 07/10”; lưu trú “08/10 → 10/10”), hình, tên, “Spa, mới đặt” / “…, khách đã đổi lịch” / “…, nhân viên bị vô hiệu hóa” (G-08). Phiếu đang chọn viền Lagoon. | `GET /appointments?status=Pending&type=&page=1&pageSize=50` |
| 3 | Đầu thẻ chi tiết | Hình, “<tên>, <loài> <giống>, nhóm <…>”, “<mã>. <tên khách>, <SĐT> (G-05), <có tài khoản>”, badge Chờ xác nhận. | `GET /appointments/{id}`, `GET /pets/{petId}` |
| 4 | Thông tin lịch | 3 ô: Dịch vụ / Nhận; Khung giờ (“HH:mm – HH:mm, dd/MM”, “Giữ chỗ đến … gồm dọn dẹp”) / Trả (số đêm); Tạm tính (+ tính cách / công thức lưu trú). | `services[]`, `slotStart`, `slotEnd`, `plannedCheckIn`, `plannedCheckOut`; tạm tính tính ở web từ bảng giá (Suy ra) |
| 5 | Nhân viên spa phụ trách | “Nhân viên spa phụ trách, cần <n> người”, “Đã chọn x / n”; chú thích thứ tự đề xuất; mỗi lựa chọn: ô chọn (radio khi cần 1, ô vuông khi cần 2), avatar, họ tên, thẻ “Hệ thống đề xuất” (Apricot) cho người trong `suggested`, số “<k> lịch / 30 ngày”. UI demo còn có dòng ca làm, giờ rảnh, người trùng lịch (khóa) và thẻ “Ngoài ca làm” – chưa có trong API (G-08). | `GET /appointments/{id}/suggestions` → `staffRequired`, `suggested[]`, `alternatives[]` (`staffId`, `fullName`, `recentAssignmentCount`) |
| 6 | Chân thẻ | “Từ chối: cửa hàng không thể đáp ứng” (danger) → MW-04·D1; “Xác nhận lịch hẹn” / “Xác nhận lịch lưu trú” (chính, khóa khi chưa chọn đủ). | `POST /appointments/{id}/confirm`, `POST /appointments/{id}/reject` |
| 7 | Ghi chú lý do chờ | Alert info “Khách đã đổi lịch lúc … Khi xác nhận, số tiền tính lại…” hoặc alert cảnh báo “Cần phân công lại – Nhân viên … bị vô hiệu hóa…”. Chỉ hiện khi API có thông tin (G-08). | – |
| 8 | Chọn chuồng (lưu trú) | “Chuồng”, “Chuồng phù hợp <loài> nhóm <…>, trống trong cả <n> đêm. Bạn có thể chọn chuồng khác phù hợp.”; thẻ chọn chuồng: mã, thẻ “Hệ thống đề xuất”, mô tả; chuồng khác loài/nhóm hiện mờ “Không phù hợp kích cỡ”. | `GET /appointments/{id}/suggestions` → `cage`; chuồng khác: `GET /cages` lọc `species`, `sizeGroup`, `isActive` (trống theo đêm do backend kiểm tra – G-08) |

**Hộp thoại**
- **MW-04·D1 Từ chối lịch hẹn này?** “Dùng khi cửa hàng không có nhân viên hoặc chuồng phù hợp.”; “Lịch chuyển sang Đã hủy với lý do cửa hàng không thể đáp ứng. Khách có tài khoản nhận thông báo kèm lý do; khách vãng lai được lễ tân gọi báo.” Nút “Quay lại”, “Từ chối lịch hẹn” → `POST /appointments/{id}/reject` (không body).
- **MW-04·D2 Nhân viên ngoài ca làm** **(Đề xuất)**: mở khi `confirm` trả 409 `STAFF_OUT_OF_SHIFT`; nội dung “Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?” (SA 6.6) + `detail` của envelope; nút “Chọn lại”, “Vẫn xác nhận” → gửi lại `confirm` với `confirmOutOfShift: true`.

**Hành vi:** chọn lịch → nạp chi tiết + đề xuất, chọn sẵn người trong `suggested` (hoặc `cage`). Xác nhận spa `{ staffIds }` (đúng `staffRequired` người: “Lịch này cần đúng 2 nhân viên.”), lưu trú `{ cageId }` → 200 → toast “Đã xác nhận <mã>, phân công <tên>. Khách và nhân viên đã được thông báo.” → tự chọn lịch kế tiếp; hết lịch → `EmptyState` “Không còn lịch chờ xác nhận.” **(Đề xuất)**.

**Mã lỗi tại màn:** 409 `STAFF_CONFLICT` → `ErrorAlert` “Có nhân viên đã có lịch trùng khung giờ.” + tải lại đề xuất; `CAGE_CONFLICT` → “Chuồng đã được gán trong thời gian này.”; `STAFF_COUNT_MISMATCH` → “Lịch này cần đúng <n> nhân viên.”; `STAFF_OUT_OF_SHIFT` → MW-04·D2; `INVALID_TRANSITION` (lịch không còn chờ) → `ErrorAlert` + tải lại danh sách.

### MW-05 – Chi tiết lịch hẹn (quản lý)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-hen/[appointmentId]` |
| Mục đích | Giám sát; cập nhật trạng thái khi cần (BR-05); đổi, hủy lịch theo yêu cầu ngoài hạn hoặc khi cửa hàng không đáp ứng. |
| Tham chiếu | UC-06, 15, 19, 20, 25 · FR-EXE-05, FR-CHG-03, FR-PAY-04 · BR-05, BR-06, BR-14, BR-20, BR-24 · UF-06 |
| Wireframe | `wireframes/MW-05-chi-tiet-spa.png`, `…-luu-tru.png`, `wireframes/MW-05-d1-doi-lich-spa.png`, `…-d2-doi-lich-luu-tru.png`, `…-d3-huy-lich.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Đầu trang + thao tác | Đường dẫn “Lịch hẹn › <mã>”; hình, tiêu đề, badge, “<mã>. <khách>. <thời gian>. Nhân viên <tên> / Chuồng <mã>.”; nút “Đổi lịch” (phụ) → MW-05·D1 hoặc D2; “Hủy lịch” (danger) → MW-05·D3. Ẩn cả hai khi `Completed`/`Cancelled`; lịch `Pending` thêm liên kết “Xử lý ở Chờ xác nhận” → MW-04 **(Đề xuất)**. | `GET /appointments/{appointmentId}` |
| 2 | Vòng đời | Như CW-09 vùng 2. | `status` |
| 3 | Dịch vụ và tiến độ | “x / n xong”; dòng dịch vụ như CW-09 vùng 4 (giá theo nhóm áp dụng). | `services[]` |
| 4 | Ảnh minh chứng | Thẻ “Chỉ xem” (QL không tải ảnh); ảnh Trước/Sau; chưa có ảnh sau: ô “Chưa có ảnh sau – Nhân viên spa tải lên khi xong”. | `GET /appointments/{id}/photos` |
| 5 | Cân nặng và chi phí | Cân thực tế khi tiếp nhận (so với hồ sơ); Nhóm kích cỡ (cũ → mới, ngưỡng); Xác nhận chi phí mới (đang chờ, kèm hạn); Chi phí (cũ → mới). Kết quả xác nhận đã xong chưa có trong API (G-02). | `actualWeightKg`, `sizeGroup`, `pendingCostConfirmation`; `GET /pets/{petId}` → `weightKg` |
| 6 | Lịch sử thao tác | Dòng thời gian mới nhất ở trên, chấm màu theo loại (xong: xanh, cảnh báo: Apricot). Dựng từ các mốc có sẵn: tạo lịch, phân công, dịch vụ xong, ảnh tải lên, thanh toán, hủy (G-02). | `createdAt`, `staff[].assignedAt`, `services[].doneAt`, `photos[].uploadedAt`, `payments[].paidAt`, `cancelledAt` |
| 7 | Cập nhật trạng thái | “<trạng thái hiện tại> → <bước kế tiếp>”; nút chính theo trạng thái: spa `Confirmed` → ô cân nặng + “Tiếp nhận” (`check-in`); `Received` → “Bắt đầu thực hiện” (`start`); `InProgress` → “Chuyển sang Hoàn tất” (`complete`); lưu trú `Confirmed` → “Đối chiếu cân nặng” (`weight-check`) rồi “Tiếp nhận” (`check-in`); `InStay` → giờ trả thực tế (chỉ đọc, G-12) + “Ghi nhận trả thú cưng” (`check-out`). Nút khóa kèm lý do như SW-07, SW-11 (ví dụ “Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.”). Chú thích “Chỉ chuyển được sang bước kế tiếp đúng vòng đời. Thao tác được lưu tên người thực hiện.” | Các endpoint thực hiện ở `openapi.yaml` (x-roles có QL) |
| 8 | Thanh toán | Như CW-09 vùng 7 (không có nút trực tuyến); khoản `Unpaid` đến hạn có nút “Ghi nhận” → MW-10·D1 **(Đề xuất)**. | `GET /appointments/{id}/payments` |
| 9 | Khách hàng | Avatar, tên, SĐT (G-05), thẻ có tài khoản. | `customerName` |
| 10 | Chi tiết lưu trú | Thú cưng (liên kết “xem hồ sơ”), Chuồng, Cân thực tế, Nhận thực tế (G-02), Trả dự kiến. | `cageId`, `actualWeightKg`, `plannedCheckOut` |

**Hộp thoại**
- **MW-05·D1 Đổi lịch spa <mã>** (“Dùng khi khách gọi hotline ngoài thời hạn tự đổi, hoặc cửa hàng cần điều chỉnh.”): Ngày; Mốc giờ (từ `GET /spa/slots`, mốc hiện tại “(giữ nguyên)”); Nhân viên spa (đủ `staffRequired` người, chọn từ `GET /staff` lọc NVS đang hoạt động – `/suggestions` chỉ dùng cho lịch `Pending`, G-21); chú thích “Hệ thống kiểm tra lại mốc giờ còn chỗ và lịch của nhân viên khi lưu…”. Lưu → `PUT /appointments/{id}` `{ slotStart, staffIds, confirmOutOfShift? }` (chỉ gửi phần thay đổi). Lỗi `STAFF_CONFLICT` hiện dưới ô Nhân viên (“Có nhân viên đã có lịch trùng khung giờ.”).
- **MW-05·D2 Đổi lịch lưu trú <mã>**: Ngày trả, Giờ trả (và ngày/giờ nhận khi lịch chưa `InStay`); Chuồng (chuồng cùng loài, nhóm; hiện tại “(giữ nguyên)”); alert kết quả còn chỗ + tiền lưu trú tính lại (ước tính ở web). Lưu → `PUT /appointments/{id}` `{ plannedCheckIn?, plannedCheckOut, cageId? }`.
- **MW-05·D3 Hủy lịch hẹn**: “Chọn lý do. Khách và nhân viên phụ trách nhận thông báo kèm lý do.”; 2 lựa chọn: “Cửa hàng không thể đáp ứng” (“Nếu đã có khoản Đã thanh toán, cửa hàng hoàn 100%, xử lý ngoài hệ thống.”) / “Theo yêu cầu của khách, ngoài thời hạn tự hủy” (“Khoản đã thanh toán (nếu có) không hoàn lại.”) (BR-24). Nút “Quay lại”, “Hủy lịch hẹn” (danger đặc) → `POST /appointments/{id}/cancel` `{ reason: StoreUnable | CustomerBeyondDeadline }` → toast “Đã hủy lịch hẹn và gửi thông báo” → MW-03.

**Mã lỗi tại màn:** 409 `INVALID_TRANSITION`, `PHOTO_REQUIRED`, `SERVICES_INCOMPLETE`, `COST_CONFIRMATION_PENDING`, `PAYMENT_NOT_DUE` → lý do dưới nút / `ErrorAlert` + tải lại; khi đổi lịch: `SLOT_FULL`, `NO_CAPACITY`, `STAFF_CONFLICT`, `CAGE_CONFLICT`, `STAFF_COUNT_MISMATCH`, `STAFF_OUT_OF_SHIFT` (→ hỏi như MW-04·D2).

### MW-06 – Danh mục dịch vụ

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/dich-vu` |
| Mục đích | Thêm, sửa, ngừng / mở lại dịch vụ; đặt giá, thời lượng, số nhân viên theo loài và nhóm kích cỡ. |
| Tham chiếu | UC-08, UC-09 · FR-SVC-01 → 04 · BR-11, BR-12, BR-19 |
| Wireframe | `wireframes/MW-06-dich-vu.png`, `wireframes/MW-06-d1-dich-vu.png`, `wireframes/MW-06-d2-ngung-dich-vu.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Dịch vụ”, “<a> dịch vụ đang cung cấp, <b> đã ngừng…”; nút chính “Thêm dịch vụ” → MW-06·D1. | Đếm theo `isActive` |
| 2 | Bảng | Dịch vụ (tên + mô tả) · Loài áp dụng (hình các loài có dòng giá) · Giá từ (giá thấp nhất) · Bắt đầu muộn nhất · Trạng thái (“Đang cung cấp” xanh / “Đã ngừng” xám, dòng mờ) · Thao tác: “Sửa” → D1; “Ngừng” → D2; dịch vụ đã ngừng: “Mở lại”. | `GET /services` (QL nhận cả `isActive = false`) |
| 3 | Ghi chú | “Dịch vụ đã ngừng không còn hiển thị khi khách đặt lịch mới. Giá và thời lượng sửa xong áp dụng cho các lượt đặt lịch tiếp theo.” | Tĩnh |

**MW-06·D1 Thêm / sửa dịch vụ** (ngăn kéo phải, rộng 640px): Tên dịch vụ*; Mô tả; Mốc bắt đầu muộn nhất* (chọn trong `Booking.SlotTimes`, gợi ý “Phải là một mốc giờ trong cấu hình.”); Loài áp dụng* (chip chọn nhiều); với mỗi loài đã chọn: bảng Nhóm · Giá (đ) · Thời lượng (phút) · Số nhân viên (1/2) cho mọi nhóm của loài (chuột lang chỉ Nhỏ, Lớn); chú thích “Giá, thời lượng mới áp dụng cho các lượt đặt lịch tiếp theo. Số nhân viên là 1 hoặc 2; bé khó tính luôn cần tối thiểu 2.” Thiếu ô → alert danger “Thiếu giá/thời lượng cho nhóm Vừa của Mèo.” và khóa nút lưu. Lưu → `POST /services` hoặc `PUT /services/{id}` `{ name, description, latestStartTime, pricing[] }` → toast “Đã lưu dịch vụ <tên>”. Nguồn mốc giờ: `GET /config` → `settings["Booking.SlotTimes"]`.

**MW-06·D2 Ngừng cung cấp dịch vụ này?** “Bạn có thể mở lại bất cứ lúc nào.”; “Dịch vụ sẽ không còn hiển thị khi khách hàng và lễ tân đặt lịch mới.” → `PATCH /services/{id}/status` `{ isActive: false }`. “Mở lại” trên bảng gọi `{ isActive: true }` không cần hộp thoại, toast “Đã mở lại <tên>”.

**Kiểm tra dữ liệu nhập** (SA 6.6): giá ≥ 0, thời lượng > 0, số nhân viên 1 hoặc 2 (“Số nhân viên chỉ có thể là 1 hoặc 2.”), mốc giờ thuộc danh sách (“Vui lòng chọn mốc giờ hợp lệ.”), ít nhất một loài.

### MW-07 – Chuồng và giá lưu trú

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/chuong-va-gia` (`?tab=cages\|pricing`) |
| Mục đích | Quản lý chuồng (thêm, sửa, ngừng / mở lại) và xem tình trạng; đặt giá lưu trú, thức ăn theo đêm và phí trả muộn. |
| Tham chiếu | UC-27, UC-33 · FR-HTL-01 → 03, 08 · BR-21, BR-22 |
| Wireframe | `wireframes/MW-07-chuong.png`, `wireframes/MW-07-gia-luu-tru.png`, `wireframes/MW-07-d1-chuong.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề + nút chính theo tab | “Chuồng và giá lưu trú”, “Sức chứa lưu trú là số chuồng đang sử dụng.”; tab Chuồng: “Thêm chuồng” → MW-07·D1; tab Giá: “Lưu bảng giá”. | – |
| 2 | Tab | Chuồng (kèm tổng số) · Giá lưu trú và phí trả muộn. | `?tab` |
| 3 | 4 thẻ số liệu | Sức chứa (chuồng đang sử dụng) · Đang chứa (danh sách mã) · Trống · Ngừng sử dụng. | Đếm từ `GET /cages` |
| 4 | Bảng chuồng | Mã · Loài · Nhóm · Tình trạng (Trống / Đang chứa / Ngừng sử dụng) · Đang chứa (hình, tên, “Chủ: <khách>. Trả HH:mm dd/MM”) · Thao tác: “Sửa” → D1; chuồng trống: “Ngừng sử dụng”; chuồng ngừng: “Mở lại” (dòng mờ). | `GET /cages?page=1&pageSize=100`; `PATCH /cages/{id}/status` `{ isActive }` |
| 5 | Bảng giá mỗi đêm | Loài · Nhóm · Chỗ ở/đêm · Thức ăn/đêm (ô nhập số, hậu tố đ); chuột lang 2 nhóm. | `GET /hotel/pricing` → `pricing[]`; lưu `PUT /hotel/pricing` `{ pricing[], lateFeePerBlock }` |
| 6 | Phí trả muộn | Mức phí mỗi lần*; chú thích “Miễn phí 30 phút đầu… Hai mốc thời gian này đổi tại Cấu hình.” (liên kết MW-13 `?group=hotel`); alert info “Giá mới áp dụng cho lịch lưu trú tạo sau khi lưu…”. | `lateFeePerBlock` |

**MW-07·D1 Thêm / sửa chuồng:** “Chuồng mới tính ngay vào sức chứa lưu trú.”; Mã chuồng* (≤ 20 ký tự), Loài*, Nhóm kích cỡ*. Lưu → `POST /cages` / `PUT /cages/{id}` → toast “Đã thêm chuồng <mã>”. Lỗi 409 `DUPLICATE_CAGE_CODE` → dưới ô Mã “Mã chuồng đã tồn tại.”

**Hành vi:** “Ngừng sử dụng” / “Mở lại” không cần hộp thoại (UI demo), toast “Đã ngừng sử dụng chuồng <mã>”. Rời tab Giá khi có thay đổi chưa lưu → hỏi xác nhận **(Đề xuất)**.

### MW-08 – Nhân viên

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/nhan-vien` |
| Mục đích | Tạo, sửa, vô hiệu hóa tài khoản lễ tân và nhân viên spa. |
| Tham chiếu | UC-26 · FR-STF-01 → 03 · BR-27 |
| Wireframe | `wireframes/MW-08-nhan-vien.png`, `wireframes/MW-08-d1-nhan-vien.png`, `wireframes/MW-08-d2-vo-hieu-hoa.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Nhân viên”, “<a> nhân viên spa và <b> lễ tân đang hoạt động.”; nút chính “Thêm nhân viên” → D1. | Đếm từ `GET /staff` |
| 2 | Lọc nhanh | Chip kèm số: Tất cả · Nhân viên spa · Lễ tân · Đã vô hiệu hóa. | Lọc ở web |
| 3 | Bảng | Nhân viên (avatar + họ tên) · Số điện thoại (đăng nhập) · Vai trò · Trạng thái (“Đang hoạt động” xanh / “Đã vô hiệu hóa”, dòng mờ) · Ngày tạo (G-09) · Thao tác: “Sửa” → D1; đang hoạt động: “Vô hiệu hóa” → D2. | `GET /staff?page=1&pageSize=100` → `staffId`, `userName`, `fullName`, `staffRole`, `isActive` |
| 4 | Ghi chú | “Màn hình này chỉ tạo tài khoản lễ tân và nhân viên spa. Lịch làm việc của nhân viên spa đặt tại Lịch làm việc.” (liên kết MW-12). | Tĩnh |

**MW-08·D1 Thêm / sửa nhân viên** (ngăn kéo 520px): Họ tên*; Số điện thoại* (“Dùng làm tên đăng nhập.”, chỉ nhập khi tạo, sửa thì chỉ đọc); Vai trò* (thẻ chọn: Lễ tân – “Ghi nhận khách vãng lai, đặt lịch thay, tiếp nhận, trả thú cưng, thu tiền tại quầy”; Nhân viên spa – “Thực hiện lịch spa được phân công, chụp ảnh trước và sau”); Mật khẩu ban đầu* (chỉ khi tạo, “Nhân viên dùng để đăng nhập web nhân viên lần đầu.”). Tạo → `POST /staff` `{ userName, fullName, staffRole, password }` → toast “Đã tạo tài khoản cho <tên>”; sửa → `PUT /staff/{id}` `{ fullName, staffRole }`. Lỗi 409 `DUPLICATE_CONTACT` → dưới ô Số điện thoại.

**MW-08·D2 Vô hiệu hóa tài khoản <tên>?** “Dùng khi nhân viên nghỉ việc.”; gạch đầu dòng: mất quyền đăng nhập ngay; lịch spa Đã xác nhận đang phân công cho người này quay về Chờ xác nhận, khách được thông báo; không còn trong đề xuất và lịch làm việc. → `POST /staff/{id}/deactivate` → 200 `{ returnedToPending }` → toast “Đã vô hiệu hóa <tên>. <n> lịch đã về Chờ xác nhận.”; n > 0 thì chuyển MW-04.

### MW-09 – Khách hàng bị khóa tự đặt lịch

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/go-khoa-dat-lich` |
| Mục đích | Xem khách bị khóa do vắng mặt nhiều lần; gỡ khóa sau khi khách liên hệ hotline. |
| Tham chiếu | UC-22 · FR-BOOK-06, 07 · BR-15 |
| Wireframe | `wireframes/MW-09-khach-bi-khoa.png`, `wireframes/MW-09-d1-go-khoa.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Khách bị khóa tự đặt lịch”, “Hệ thống tự khóa khi khách vắng mặt quá 3 lần trong 30 ngày. Gỡ khóa sau khi khách liên hệ hotline.” | – |
| 2 | Bảng | Khách hàng (avatar, tên) · Số điện thoại · Vắng mặt trong 30 ngày · Các lần vắng mặt · Bị khóa từ (3 cột này chưa có trong API – G-10) · “Gỡ khóa” (phụ) → D1. | `GET /customers?page=&pageSize=` (QL chỉ nhận khách bị khóa) → `fullName`, `phone`, `email` |
| 3 | Ghi chú | Alert neutral “Khi bị khóa, khách vẫn đặt lịch được qua lễ tân tại quầy hoặc hotline.” | Tĩnh |

**MW-09·D1 Gỡ khóa tự đặt lịch?** “Khách đã liên hệ cửa hàng qua hotline.”; “Khách có thể tự đặt lịch trực tuyến trở lại ngay sau khi gỡ khóa.” → `POST /customers/{id}/unlock-booking` → 204 → toast “Đã gỡ khóa tự đặt lịch”, tải lại. Lỗi 409 `CUSTOMER_NOT_LOCKED` → tải lại danh sách + toast lỗi.

**Trạng thái:** rỗng → “Không có khách nào bị khóa.” **(Đề xuất)**.

### MW-10 – Thanh toán

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/thanh-toan` (`?status=Unpaid\|Paid`) |
| Mục đích | Theo dõi các khoản thanh toán toàn cửa hàng; ghi nhận tại quầy khi cần. |
| Tham chiếu | UC-23, UC-25 · FR-PAY-02, 04 · BR-07, BR-17 |
| Wireframe | `wireframes/MW-10-thanh-toan.png`, `wireframes/MW-10-d1-thanh-toan-quay.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Thẻ số liệu | Chưa thanh toán (số khoản, tổng tiền); Đã thanh toán tháng này; Trực tuyến tháng này (G-07: tạm chỉ hiện thẻ “Chưa thanh toán”). | `GET /payments?status=Unpaid&pageSize=100` |
| 2 | Bộ lọc | Chip Tất cả / Chưa thanh toán (số) / Đã thanh toán; ô Mọi khoản (Spa, Tiền lưu trú, Phí trả muộn); ô Mọi phương thức (lọc ở web trên trang đang xem – G-07). | `status` |
| 3 | Bảng | Lịch hẹn (mã → MW-05; dòng phụ tên thú cưng, khách – G-07) · Khoản · Số tiền · Trạng thái · Ghi nhận (phương thức, thời điểm) · thao tác “Ghi nhận” (khoản `Unpaid`) → D1. | `GET /payments?status=&page=&pageSize=20` → `items[]` (`paymentId`, `appointmentId`, `kind`, `amount`, `status`, `method`, `paidAt`) |
| 4 | Chân bảng | “Hiển thị a – b trong n khoản” + phân trang; chú thích “Lịch spa chỉ phát sinh khoản thanh toán khi hoàn tất. Lịch lưu trú có tối đa 2 khoản…”. | `total` |

**MW-10·D1 Ghi nhận thanh toán tại quầy:** “<tên>, <khoản>, <mã>.”; Số tiền phải trả; Phương thức (Tiền mặt / Chuyển khoản QR); Số tiền thực nhận (“Phải bằng hoặc lớn hơn số tiền phải trả.”). → `POST /payments/{id}/counter` `{ method, receivedAmount }` → toast “Đã ghi nhận thanh toán <số tiền>”. Mã lỗi như SW-09.

### MW-11 – Hồ sơ cá nhân (quản lý)

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/ho-so` |
| Tham chiếu | UC-03 · FR-ACC-03 |
| Wireframe | `wireframes/MW-11-ho-so.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Thông tin | Họ tên, Số điện thoại: chỉ đọc (QL không có họ tên trong API, `PUT /me` bỏ qua `fullName` và `phone` của QL – G-11); Email (sửa được); nút “Hủy bỏ”, “Lưu thay đổi”. | `GET /me`; `PUT /me` `{ email }` |
| 2 | Tóm tắt | Avatar nền Lagoon 800, tên hiển thị, “Quản lý cửa hàng”. | `GET /me` |
| 3 | Đăng xuất | Nút phụ “Đăng xuất”. | – |

### MW-12 – Lịch làm việc nhân viên spa

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/lich-lam-viec` (`?week=YYYY-MM-DD` = thứ hai của tuần) |
| Mục đích | Phân ca theo tuần cho nhân viên spa; ca quyết định mốc giờ còn chỗ và đề xuất nhân viên. |
| Tham chiếu | UC-35 · FR-STF-04 · BR-04, BR-13 · X-01 · UF-07 |
| Wireframe | `wireframes/MW-12-lich-lam-viec.png`, `wireframes/MW-12-sua-ca-loi.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Tiêu đề | “Lịch làm việc nhân viên spa”, “Ca làm quyết định mốc giờ còn chỗ và danh sách nhân viên được đề xuất.”; nút tuần trước / sau + “Tuần dd/MM – dd/MM/yyyy”; nút chính “+ Thêm ca”. | `?week` |
| 2 | Bảng ca theo tuần | Hàng: NVS đang hoạt động (avatar, tên); cột T2 → CN; ô có ca: “HH:mm – HH:mm” (bấm để sửa, ô đang chọn viền Lagoon); ô không ca: “—”. Chân bảng: “Chỉ hiện nhân viên spa đang hoạt động. Ô “—” là ngày không có ca.” | `GET /staff` (lọc `SpaStaff`, `isActive`); `GET /work-shifts?from=<thứ hai 00:00>&to=<thứ hai kế tiếp 00:00>&pageSize=200` → `shiftId`, `staffId`, `shiftStart`, `shiftEnd` |
| 3 | Hướng dẫn | Khi chưa chọn ca: “Chọn một ô ca trong bảng để sửa – Hoặc bấm Thêm ca… Không sửa, xóa được phần ca còn lịch hẹn đã xác nhận.” | – |
| 4 | Form thêm / sửa ca (thay vùng 3) | Tiêu đề “Thêm ca” / “Sửa ca: <tên>, dd/MM”; Nhân viên spa (chọn; khi sửa chỉ đọc), Ngày, Từ, Đến; chú thích ràng buộc; nút “Xóa ca” (danger, chỉ khi sửa), “Lưu ca”. | `POST /work-shifts` `{ staffId, shiftStart, shiftEnd }`; `PUT /work-shifts/{id}` `{ shiftStart, shiftEnd }`; `DELETE /work-shifts/{id}` |
| 5 | Cảnh báo không thể rút ngắn | Alert cảnh báo “Không thể rút ngắn ca – <tên> còn lịch hẹn đã xác nhận … trong phần ca bị bỏ. Hãy phân công lại nhân viên khác trước.”; ô “Đến” viền đỏ; nút lưu khóa cho tới khi sửa lại giờ. | 409 `SHIFT_HAS_APPOINTMENTS` |

**Kiểm tra dữ liệu nhập:** Đến sau Từ (“Giờ kết thúc phải sau giờ bắt đầu.”), không gọi API khi sai.

**Mã lỗi tại màn:** 409 `SHIFT_OVERLAP` → “Nhân viên đã có ca trong khoảng này.”; 409 `SHIFT_HAS_APPOINTMENTS` → vùng 5 (“Còn lịch hẹn đã xác nhận trong ca này, hãy phân công lại trước.”); 400 (nhân viên không phải NVS hoặc đã vô hiệu hóa) → `ErrorAlert`.

### MW-13 – Cấu hình hệ thống

| Mục | Nội dung |
| --- | --- |
| Đường dẫn | `/cau-hinh` (`?group=booking\|noshow\|weight\|hotel`) |
| Mục đích | Xem, chỉnh tham số nghiệp vụ, bảng mốc kích cỡ, ngưỡng dung sai; có hiệu lực ngay cho thao tác sau. |
| Tham chiếu | UC-36 · FR-CFG-01 · SA 7.2 · BR-08, BR-15, BR-19, BR-20, BR-22, BR-23 |
| Wireframe | `wireframes/MW-13-cau-hinh-dat-lich.png`, `wireframes/MW-13-cau-hinh-can-nang.png` |

| # | Vùng | Thành phần, dữ liệu | API / nguồn |
| --- | --- | --- | --- |
| 1 | Nhóm tham số | Danh sách bên trái: Đặt lịch và giữ chỗ · Vắng mặt và khóa · Cân nặng và kích cỡ · Lưu trú. | `?group` |
| 2 | Đặt lịch và giữ chỗ | Hạn tự đổi, hủy trước giờ hẹn (phút, “Từ 60 đến 120 phút.”); Giữ chỗ sau giờ hẹn (phút); Dọn dẹp sau mỗi lịch spa (“Từ 15 đến 20 phút.”); Số ngày tính khi đề xuất nhân viên; Ảnh trước chăm sóc hợp lệ trong (ngày). | `GET /config` → `settings` (`Booking.ChangeCancelDeadlineMinutes`, `Booking.HoldMinutes`, `Booking.BufferMinutes`, `Suggest.LookbackDays`, `Photo.ValidityDays`) |
| 3 | Các mốc giờ khách được chọn | Thẻ từng mốc “HH:mm” (bấm để xóa **(Đề xuất)**) + nút “Thêm mốc”; gợi ý “Định dạng HH:mm, tăng dần…”. | `settings["Booking.SlotTimes"]` |
| 4 | Chân thẻ | “Hoàn tác” (trả về giá trị đang lưu), “Lưu thay đổi” (khóa khi có lỗi). | `PUT /config` (chỉ gửi phần của nhóm đang sửa) |
| 5 | Mốc phân nhóm kích cỡ | Bảng Loài · Tiêu chí · “Nhỏ: dưới” · “Vừa: dưới” · Lớn (chữ “từ …”); chuột lang: ô Vừa “Không có nhóm Vừa” vô hiệu. | `sizeRules[]` (`species`, `criterion`, `smallUpper`, `mediumUpper`) |
| 6 | Ngưỡng dung sai cân nặng | Bảng Loài · Ranh giới nhóm · Ngưỡng (kg); chú thích “Chênh bằng ngưỡng vẫn tính là trong ngưỡng”. | `weightTolerances[]` (`species`, `fromGroup`, `toGroup`, `toleranceKg`) |
| 7 | Thời hạn xác nhận chi phí | “Thời hạn khách xác nhận chi phí mới” (phút, “Quá hạn, lịch tự động hủy.”) + chân thẻ như vùng 4. | `settings["CostConfirm.TimeoutMinutes"]` |

Nhóm **Vắng mặt và khóa**: “Khóa khi vắng mặt quá” (lần) – `NoShow.LockThreshold`; “Trong khoảng” (ngày gần nhất) – `NoShow.WindowDays`; chú thích “Lần vắng mặt thứ 4 trong 30 ngày sẽ khóa…” (liên kết MW-09). Nhóm **Lưu trú**: “Miễn phí trễ” (phút) – `Hotel.LateGraceMinutes`; “Mỗi lần phạt tính theo” (phút) – `Hotel.LateBlockMinutes`; ô giải thích công thức và liên kết MW-07 `?tab=pricing` cho mức phí (`Hotel.LateFeePerBlock` chỉ đọc ở đây).

**Kiểm tra dữ liệu nhập** (SA 6.6, openapi `ConfigSettings`): hạn tự đổi/hủy 60 – 120 (“Giá trị phải từ 60 đến 120 phút.”); dọn dẹp 15 – 20 (“Giá trị phải từ 15 đến 20 phút.”); các số nguyên khác ≥ 1; mốc giờ đúng `HH:mm`, tăng dần, không trùng; ngưỡng kích cỡ tăng dần (`smallUpper` < `mediumUpper`); dung sai ≥ 0.

**Hành vi:** lưu thành công → toast “Đã lưu cấu hình <tên nhóm>”; đổi nhóm khi có thay đổi chưa lưu → hỏi xác nhận **(Đề xuất)**. Lỗi 400 `VALIDATION_ERROR` → `ErrorAlert` đầu thẻ (giữ dữ liệu đã nhập).

---

## 6. Bảng tra API theo màn

Đọc: dùng khi cần biết màn nào gọi endpoint nào; chi tiết request/response xem `openapi.yaml`.

| Màn | Đọc (GET) | Ghi |
| --- | --- | --- |
| CW-01 | – | `POST /auth/register` |
| CW-02, SW-01, MW-01 | `/me` | `POST /auth/login` (qua `/api/session/login`, Frontend-Architecture mục 6) |
| Khung CW / SW / MW | `/me`, `/notifications` (KH, NVS), `/appointments?status=Pending` (QL) | `POST /auth/logout` |
| CW-03 | `/me`, `/services`, `/hotel/pricing`, `/appointments`, `/appointments/{id}` | – |
| CW-04 | `/pets` | `DELETE /pets/{id}` |
| CW-05 | `/pets/{id}` | `POST /pets`, `PUT /pets/{id}` |
| CW-06 | `/pets`, `/services`, `/spa/slots` | `POST /appointments/spa` |
| CW-07 | `/pets`, `/hotel/pricing`, `/hotel/availability` | `POST /appointments/hotel` |
| CW-08 | `/appointments`, `/pets` | – |
| CW-09 | `/appointments/{id}`, `/pets/{id}`, `/services`, `/hotel/pricing`, `/appointments/{id}/photos`, `/appointments/{id}/payments` | `POST /appointments/{id}/cancel`, `POST /appointments/{id}/cost-confirmation/respond`, `POST /payments/{id}/online` |
| CW-10 | `/appointments/{id}`, `/pets`, `/services`, `/spa/slots`, `/hotel/availability` | `PUT /appointments/{id}` |
| CW-11 | `/pets`, `/appointments`, `/appointments/{id}`, `/appointments/{id}/payments`, `/appointments/{id}/photos` | – |
| CW-12, SW-13 | `/notifications` | `POST /notifications/{id}/read` |
| CW-13, SW-15, MW-11 | `/me`, `/pets` (CW-13) | `PUT /me` |
| SW-02 | `/appointments`, `/appointments/{id}`, `/pets/{id}`, `/cages` (LT) | – |
| SW-03 | `/appointments/{id}`, `/pets/{id}`, `/services`, `/appointments/{id}/payments` | – |
| SW-04 | `/customers`, `/pets`, `/appointments` | `POST /customers/walk-in` |
| SW-05 | `/pets/{id}` | `POST /pets`, `PUT /pets/{id}` |
| SW-06 | `/pets`, `/services`, `/spa/slots`, `/hotel/availability`, `/hotel/pricing` | `POST /appointments/spa`, `POST /appointments/hotel` |
| SW-07 | `/appointments`, `/appointments/{id}`, `/pets/{id}`, `/cages`, `/appointments/{id}/payments` | `POST /appointments/{id}/check-in`, `POST /appointments/{id}/weight-check`, `POST /appointments/{id}/cost-confirmation/respond` |
| SW-08 | `/cages`, `/appointments` | – |
| SW-09, MW-10·D1 | `/appointments`, `/appointments/{id}`, `/appointments/{id}/payments`, `/hotel/pricing`, `/services`, `/me` | `POST /payments/{id}/counter` |
| SW-10 | `/appointments/{id}`, `/cages`, `/appointments/{id}/payments` | `POST /appointments/{id}/check-out` |
| SW-11 | `/appointments/{id}`, `/pets/{id}`, `/appointments/{id}/photos` | `POST /appointments/{id}/photos`, `POST /appointments/{id}/start`, `PATCH /appointments/{id}/services/{serviceId}`, `POST /appointments/{id}/complete` |
| SW-12 | `/appointments` | – |
| SW-14 | `/services` | – |
| MW-02 | `/appointments`, `/appointments/{id}`, `/cages`, `/payments`, `/staff`, `/work-shifts`, `/config` | – |
| MW-03 | `/appointments`, `/cages`, `/appointments/{id}/payments` | – |
| MW-04 | `/appointments`, `/appointments/{id}`, `/pets/{id}`, `/appointments/{id}/suggestions`, `/cages`, `/services`, `/hotel/pricing` | `POST /appointments/{id}/confirm`, `POST /appointments/{id}/reject` |
| MW-05 | `/appointments/{id}`, `/pets/{id}`, `/appointments/{id}/photos`, `/appointments/{id}/payments`, `/spa/slots`, `/hotel/availability`, `/staff`, `/cages` | `PUT /appointments/{id}`, `POST /appointments/{id}/cancel`, `POST /appointments/{id}/check-in`, `POST /appointments/{id}/weight-check`, `POST /appointments/{id}/start`, `POST /appointments/{id}/complete`, `POST /appointments/{id}/check-out` |
| MW-06 | `/services`, `/config` | `POST /services`, `PUT /services/{id}`, `PATCH /services/{id}/status` |
| MW-07 | `/cages`, `/hotel/pricing` | `POST /cages`, `PUT /cages/{id}`, `PATCH /cages/{id}/status`, `PUT /hotel/pricing` |
| MW-08 | `/staff` | `POST /staff`, `PUT /staff/{id}`, `POST /staff/{id}/deactivate` |
| MW-09 | `/customers` | `POST /customers/{id}/unlock-booking` |
| MW-10 | `/payments` | `POST /payments/{id}/counter` |
| MW-12 | `/staff`, `/work-shifts` | `POST /work-shifts`, `PUT /work-shifts/{id}`, `DELETE /work-shifts/{id}` |
| MW-13 | `/config` | `PUT /config` |

---

## 7. Chênh lệch giữa UI demo và API, cách xử lý tạm

UI demo vẽ một số dữ liệu mà `openapi.yaml` chưa trả hoặc vai trò đó chưa được đọc. Web làm theo cột “Xử lý tạm” cho tới khi BE bổ sung API (thêm API phải cập nhật `openapi.yaml`, `API-Notes.md` trước, theo Backend-Conventions 12.2). Cột “Đề xuất cho BE” là gợi ý, chưa chốt.

| Mã | Chênh lệch | Màn | Xử lý tạm ở web | Đề xuất cho BE |
| --- | --- | --- | --- | --- |
| G-01 | Mã lịch hẹn ngắn “LH-1029”: API chỉ có `appointmentId` (uuid). | Mọi màn có lịch hẹn | “LH-” + 8 ký tự đầu của uuid, viết hoa (mục 2.6). | Thêm mã tăng dần, ví dụ `code`. |
| G-02 | Mốc thời gian từng bước vòng đời và “Lịch sử thao tác”: DB 4.4 quyết định không lưu lịch sử trạng thái; API chỉ có `createdAt`, `updatedAt`, `cancelledAt` và mốc con. Yêu cầu xác nhận chi phí đã xử lý không còn trong `pendingCostConfirmation`. | CW-09, SW-03, MW-05 | Vòng đời chỉ ghi giờ ở bước Chờ xác nhận (`createdAt`) và Đã hủy (`cancelledAt`); dòng thời gian MW-05 dựng từ mốc có sẵn (mục MW-05 vùng 6), không ghi tên người thao tác. | Giữ nguyên quyết định DB, hoặc trả thêm mốc chuyển trạng thái nếu nhóm muốn. |
| G-03 | Tham số cấu hình (hạn tự đổi/hủy, giữ chỗ, thời hạn xác nhận chi phí, ngưỡng khóa, miễn phí trễ) chỉ đọc được qua `GET /config` (QL). | CW-03, CW-06, CW-09, SW-02, SW-03, SW-07 | Không hiện giờ hạn cụ thể; nút Đổi/Hủy bật khi lịch `Pending`/`Confirmed`, chuyển sang trạng thái quá hạn khi API trả 409 `CHANGE_WINDOW_CLOSED`; CW-03 hiện giá trị mặc định SA 7.2. | Trả `changeDeadline`, `holdUntil` trong lịch hẹn, hoặc mở một endpoint đọc tham số công khai cho mọi vai trò đã đăng nhập. |
| G-04 | `Me` không có `isBookingLocked` và ngày tạo tài khoản. | CW-06, CW-07, CW-13 | Chỉ biết bị khóa khi đặt lịch trả 403 `BOOKING_LOCKED`; CW-13 ẩn dòng “Khách hàng từ …” và “Tự đặt lịch trực tuyến”. | Thêm `isBookingLocked`, `createdAt` vào `Me` của KH. |
| G-05 | Lịch hẹn thiếu dữ liệu hiển thị: tên nhân viên trong danh sách; mã chuồng (KH không gọi được `GET /cages`); SĐT khách; khách có tài khoản hay vãng lai; `busyUntil`; giá từng dịch vụ và số tiền tạm tính trong chi tiết. | CW-08, CW-09, CW-11, SW-02, SW-03, SW-07, MW-02 → MW-05 | Giá: tra `GET /services` theo loài + nhóm; mã chuồng (LT, QL): tra `GET /cages`; nhân viên: gọi `GET /appointments/{id}` cho từng lịch khi số lượng nhỏ (trong ngày), còn lại hiện “—”; các trường khác ẩn. | Thêm vào `Appointment`: `staff[{ staffId, fullName }]`, `cageCode`, `customerPhone`, `customerHasAccount`, `busyUntil`; vào `AppointmentDetail`: `estimatedAmount`, giá từng dịch vụ. |
| G-06 | Lọc/sắp xếp lịch hẹn: chỉ `date` (một ngày), `status` (một giá trị), `type`, `petId`; không có khoảng ngày, tìm kiếm, `customerId`, nhiều trạng thái; thứ tự sắp xếp chưa quy định; chưa rõ `date` áp cho lịch lưu trú theo ngày nhận, ngày trả hay mọi ngày lưu trú. | CW-08, SW-02, SW-04, SW-12, MW-03 | Gọi không lọc trạng thái rồi lọc ở web (trang đầu, `pageSize` lớn); sắp xếp ở web theo thời gian hẹn; ô tìm kiếm và khoảng ngày tạm ẩn. | Thêm `from`, `to`, `search`, `customerId`, `status` nhiều giá trị, `sort`; ghi rõ ý nghĩa `date` với lịch lưu trú. |
| G-07 | Thanh toán: `Payment` không có tên thú cưng/khách, người xác nhận; không lọc theo `kind`/`method`; không có số liệu tổng hợp tháng; LT không gọi được `GET /payments` để có danh sách khoản cần thu. | SW-09, MW-03, MW-10 | SW-09 dựng danh sách từ lịch trong ngày + `GET /appointments/{id}/payments`; MW-10 hiện mã lịch (liên kết MW-05), lọc `kind`/`method` ở web trên trang đang xem, chỉ hiện thẻ “Chưa thanh toán”. | Thêm `petName`, `customerName`, `recordedBy` vào `Payment`; lọc `kind`, `method`, `from`, `to`; cho LT đọc khoản `Unpaid` đến hạn. |
| G-08 | Đề xuất phân công thiếu: giờ ca, giờ rảnh, nhân viên trùng lịch, nhân viên ngoài ca; lý do lịch quay về Chờ xác nhận (khách đổi lịch / NVS bị vô hiệu hóa); đề xuất chuồng chỉ 1 chuồng. | MW-02, MW-03, MW-04 | Chỉ hiện tên + số lịch 30 ngày; người ngoài ca và trùng lịch biết qua 409; không hiện lý do chờ; chuồng khác lấy từ `GET /cages` cùng loài/nhóm. | Thêm `shiftStart`, `shiftEnd`, `isOutOfShift`, danh sách người trùng lịch vào `/suggestions`; thêm `pendingReason`; trả danh sách chuồng trống. |
| G-09 | `Staff` thiếu ngày tạo, ngày vô hiệu hóa. | MW-08 | Ẩn cột Ngày tạo. | Thêm `createdAt`, `deactivatedAt`. |
| G-10 | `Customer` thiếu số lần vắng mặt, các ngày vắng mặt, thời điểm bị khóa. | MW-09 | Chỉ hiện tên, SĐT, email. | Thêm `noShowCount`, `lockedAt`. |
| G-11 | `PUT /me`: `phone` chỉ áp dụng KH; QL không có họ tên (bỏ qua `fullName`). UI demo cho sửa SĐT ở SW-15 và họ tên, SĐT ở MW-11. | SW-15, MW-11, khung MW | SW-15: SĐT chỉ đọc; MW-11: chỉ sửa email; tên QL hiển thị bằng `userName`. | Giữ API; cập nhật UI demo cho khớp. |
| G-12 | `POST /appointments/{id}/check-out` không nhận thời điểm trả (backend lấy giờ hiện tại); LT không đọc được mốc miễn phí trễ để xem trước phí; chưa rõ khi trả 409 `PAYMENT_NOT_DUE` thì `ActualCheckOut` và khoản `LateFee` đã được ghi chưa. | SW-10, MW-05 | Giờ trả hiển thị chỉ đọc; chỉ báo “trễ n phút”, số tiền do backend tính; luồng: gọi check-out → 409 → tải lại khoản → thu `LateFee` → gọi lại. | Xác nhận lần gọi đầu ghi `ActualCheckOut` + tạo khoản `LateFee` rồi mới trả 409. |
| G-13 | Ảnh trước hợp lệ = ảnh gần nhất của thú cưng trong 7 ngày (có thể thuộc lịch khác); `Photo` không có tên người chụp. | SW-11, CW-09, MW-05 | “Hợp lệ” khi lịch đang mở có ảnh `Before`; điều kiện cuối cùng theo 409 `PHOTO_REQUIRED`; không hiện người chụp. | Trả `hasValidBeforePhoto` trong chi tiết lịch spa; thêm `uploadedByName` vào `Photo`. |
| G-14 | Không có `GET /customers/{id}`. | SW-05, SW-06 | Giữ “khách đang phục vụ” chọn ở SW-04 trong phiên làm việc (Frontend-Architecture mục 5); mất thì quay lại SW-04. | Thêm `GET /customers/{id}` cho LT. |
| G-15 | URL trả về sau thanh toán trực tuyến do backend cấu hình. | CW-09 | Trang trả về `/lich-hen/{appointmentId}?payment=return`, đọc kết quả bằng `GET /appointments/{id}/payments`. | Chốt `Payment__*__ReturnUrl` theo đường dẫn trên. |
| G-16 | Thông tin tĩnh của cửa hàng chưa có nguồn: hotline, địa chỉ, giờ mở cửa, tài khoản ngân hàng để tạo QR. | CW-02, CW-03, CW-09, SW-09 | Khai báo trong `lib/store-info.ts` của từng web (không phải secret); giá trị trong UI demo là minh họa, cần nhóm chốt. | – |
| G-17 | `CageOccupant` thiếu `appointmentId`. | SW-08 | Tìm lịch `InStay` trong ngày theo `petId`. | Thêm `appointmentId` vào `occupant`. |
| G-18 | NVS không xem được ca làm của mình (`GET /work-shifts` chỉ QL). | SW-02 | Ẩn dòng “Ca làm …”. | Cho NVS đọc ca của chính mình. |
| G-19 | Thông báo: không lọc được theo `isRead`. | CW-12, SW-13 | Tab “Chưa đọc” lọc ở web trên các trang đã tải. | Thêm `?isRead=false`. |
| G-20 | SW-07·D1 “Khách phản hồi qua” (trực tiếp / điện thoại) không có trường trong API. | SW-07 | Không làm nhóm chọn này. | – |
| G-21 | `GET /appointments/{id}/suggestions` chỉ cho lịch `Pending`; QL đổi nhân viên của lịch đã xác nhận (UC-15) không có đề xuất. | MW-05 | Chọn từ `GET /staff` (NVS đang hoạt động); trùng lịch, ngoài ca biết qua 409. | Cho `/suggestions` nhận lịch `Confirmed` khi QL đổi lịch. |

