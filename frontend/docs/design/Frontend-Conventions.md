# Frontend Conventions – Hệ thống quản lý spa thú cưng

*Quy ước viết mã cho 3 web Next.js* · Phiên bản 1.0 · Ngày lập: 21/10/2026

**Nguồn:** `Frontend-Architecture.md` (**FA**), `Design-System.md` (**DS**), `UI-Screens.md`, *System Analysis & UI Design v1.3* (**SA**: 5.1.2, 6.1, 6.6), `openapi.yaml`, `API-Notes.md`, *Definition of Done* (**DoD**), mã nguồn 3 web trên `develop` (cách viết hiện có được giữ làm chuẩn).
**Nhãn:** **(Đề xuất)** tài liệu này đề xuất, chờ nhóm duyệt · **(Hiện có)** đã làm như vậy trong mã.
**Phạm vi:** quy tắc bắt buộc khi viết mã web. Kiến trúc, thư mục, phiên đăng nhập: FA. Token, thành phần: DS. Hành vi từng màn: UI-Screens.

---

## 1. Nguyên tắc

1. **Tài liệu trước, mã sau.** Hành vi màn theo UI-Screens; bố cục theo wireframe / UI demo; tên trường, mã lỗi theo `openapi.yaml`. Thấy mâu thuẫn thì sửa tài liệu (hoặc hỏi nhóm) trước khi viết mã.
2. **Backend quyết định, web hiển thị.** Web kiểm tra dữ liệu để phản hồi nhanh, nhưng không tự quyết quyền, trạng thái, số tiền, nhóm kích cỡ, mốc giờ còn chỗ.
3. **Viết giống mã đang có.** Trước khi thêm file, xem file cùng loại trong web đó và trong 2 web còn lại (FA 3.3); thành phần đã có thì dùng lại.
4. **Chỉ làm trong phạm vi thẻ** (DoD mục A); phần để lại ghi rõ trong PR.

---

## 2. Đặt tên

| Đối tượng | Quy ước | Ví dụ |
| --- | --- | --- |
| File, thư mục mã | chữ thường, nối gạch ngang | `site-header.tsx`, `error-alert.tsx`, `appointment-detail-screen.tsx` **(Hiện có)** |
| Thư mục đường dẫn trong `app/` | tiếng Việt không dấu, nối gạch ngang (theo User-Flows 2) | `dat-lich/spa`, `lich-su-cong-viec`, `[appointmentId]` |
| Nhóm đường dẫn | `(auth)` không khung, `(main)` có khung | `app/(main)/thu-cung/page.tsx` |
| Component | PascalCase, xuất có tên (named export) | `export function ErrorAlert()` **(Hiện có)** |
| Màn hình | `<Tên>Screen`, file `<tên>-screen.tsx` trong `features/<tính-năng>/screens/` | `PetsScreen`, `SpaBookingScreen` |
| Hook | `use<Tên>`; hook dữ liệu đặt theo operation | `useAppointment`, `useCreateSpaAppointment`, `useSession` |
| Hàm gọi API | đúng `operationId` của `openapi.yaml` | `getSpaSlots`, `createSpaAppointment`, `payAtCounter` |
| Khóa query | `<tàiNguyên>Keys` | `appointmentKeys.detail(id)` |
| Kiểu dữ liệu API | đúng tên schema `openapi.yaml` | `AppointmentDetail`, `SpaBookingRequest`, `ProblemDetails` |
| Kiểu props | `<Component>Props` | `DropdownProps` **(Hiện có)** |
| Hằng số | UPPER_SNAKE_CASE, `as const` | `ROUTES`, `ERROR_CODES`, `STORE_TIME_ZONE` |
| Biến boolean | `is…`, `has…`, `can…`, `should…` | `isForbiddenError`, `canSee` **(Hiện có)** |
| Hàm xử lý sự kiện | `handle…` trong component, prop `on…` | `handleSubmit`, `onConfirm` |
| Tham số truy vấn | tên tham số API khi chuyển thẳng cho API; còn lại tiếng Anh ngắn | `?petId=`, `?status=`, `?tab=`, `?step=` |
| Khóa lưu trình duyệt | `ps.<tên>` | `ps.servingCustomer` |
| Trường JSON gửi API | camelCase đúng openapi; không đổi tên khi chuyển form → request | `actualWeightKg`, `receivedAmount` |

---

## 3. Viết component và TypeScript

- **Server / client:** `page.tsx`, `layout.tsx` là server component mỏng; màn và thành phần có tương tác ghi `"use client"` ở đầu file. Không đặt `"use client"` ở `layout.tsx` gốc. File dùng chung cho cả server và client component thì không có `"use client"` (như `header-styles.ts`) **(Hiện có)**.
- **Xuất:** component, hook, hàm dùng named export; chỉ `page`, `layout`, `route`, `not-found`, `error`, `loading` dùng `export default` (Next.js yêu cầu).
- **Props:** khai báo kiểu rõ ràng (`type XxxProps = { … }`); không truyền cả object API xuống thành phần `ui` – truyền trường cần dùng; thành phần `domain` nhận kiểu API (`Appointment`, `Pet`…).
- **Kiểu:** `strict` bật; **không dùng `any`**; dữ liệu chưa rõ dùng `unknown` rồi thu hẹp (như `toApiError`) **(Hiện có)**; không dùng `as` để ép kiểu dữ liệu API; enum API dùng union chuỗi từ `lib/api/types.ts`, không tự viết lại chuỗi.
- **Import:** dùng đường dẫn tắt `@/…` cho mọi thứ ngoài thư mục hiện tại **(Hiện có)**; không import chéo giữa `features` (FA 3.2).
- **Ghi chú trong mã:** tiếng Việt, ngắn, giải thích *vì sao* hoặc dẫn nguồn (mục SA, mã BR, mã màn), như mã hiện có (“// Vùng chạm cao 44px cho web nhân viên (mục 6.1).”). Không ghi lại điều mã đã nói rõ.
- **Màn hình:** mỗi màn một component `…Screen`; chia nhỏ theo vùng của UI-Screens (vùng 1, 2, … → component con trong `features/<tính-năng>/components/` khi dài). Đặt chú thích mã màn ở đầu file: `// CW-06 Đặt lịch spa – UI-Screens.md`.
- **Hiệu ứng:** không gọi API trong `useEffect`; dùng TanStack Query. `useEffect` chỉ cho đồng bộ với thứ ngoài React (sự kiện tài liệu, bộ đếm giờ) và luôn có hàm dọn.

---

## 4. Form và kiểm tra dữ liệu nhập

### 4.1 Cách làm

- Mọi form dùng **React Hook Form**; luật kiểm tra dùng tùy chọn có sẵn (`required`, `min`, `maxLength`, `pattern`, `validate`). Không thêm thư viện schema (zod, yup…) nếu nhóm chưa duyệt **(Đề xuất)**.
- `mode: "onTouched"`, `reValidateMode: "onChange"`, `shouldFocusError: true`.
- Luật và câu lỗi dùng ở nhiều màn đặt trong `lib/validation.ts`; luật riêng một form đặt trong `features/<tính-năng>/forms.ts` cùng giá trị mặc định và hàm chuyển giá trị form → request.
- Mỗi ô: `Field` + `Input` (DS 4.1) + `FieldError` dưới ô, gắn `aria-describedby` **(Hiện có: `FieldError`)**.
- Nút gửi: `loading` khi mutation đang chạy (chống bấm đúp – SA 6.6); không khóa nút gửi chỉ vì form chưa hợp lệ, trừ khi UI-Screens ghi khóa kèm lý do.
- Lỗi gửi: giữ nguyên dữ liệu đã nhập; lỗi gắn với một trường → `setError(field, { message })`; lỗi chung → `ErrorAlert` đầu form hoặc ngay trên nút gửi.
- Trước khi gửi: cắt khoảng trắng đầu/cuối chuỗi; chuỗi rỗng của trường không bắt buộc → bỏ trường (không gửi `""`); số nhập dấu phẩy → đổi sang số (`"9,5"` → `9.5`); số điện thoại bỏ khoảng trắng, dấu chấm, gạch ngang.
- **Không gửi** `role`, `sizeGroup`, `status`, `amount` (DoD mục B, API-Notes 3); `staffIds`, `cageId` chỉ ở thao tác của QL.

### 4.2 Luật dùng chung

| Trường | Luật | Câu lỗi | Nguồn |
| --- | --- | --- | --- |
| Họ tên | Bắt buộc, ≤ 150 ký tự | “Vui lòng nhập họ tên.” | SA 6.6, openapi |
| Số điện thoại | Bắt buộc; sau khi bỏ khoảng trắng: 10 chữ số, bắt đầu bằng 0 (`^0\d{9}$`); ≤ 20 ký tự | “Vui lòng nhập số điện thoại.” · “Số điện thoại chưa đúng định dạng.” **(Đề xuất)** | X-02, openapi `maxLength: 20` |
| Email | Không bắt buộc; nếu có: dạng `a@b.c`, ≤ 150 ký tự | “Email chưa đúng định dạng.” **(Đề xuất)** | openapi |
| Mật khẩu | Bắt buộc; độ mạnh do backend kiểm tra | “Vui lòng nhập mật khẩu.” | – |
| Nhập lại mật khẩu | Trùng mật khẩu | “Mật khẩu nhập lại không khớp.” **(Đề xuất)** | – |
| Tên thú cưng / giống | Bắt buộc, ≤ 100 ký tự | “Vui lòng nhập tên thú cưng.” · “Vui lòng nhập giống.” | SA 6.6 |
| Cân nặng (kg) | Bắt buộc, số > 0 | “Vui lòng nhập cân nặng lớn hơn 0.” · tiếp nhận: “Vui lòng nhập cân nặng thực tế lớn hơn 0.” | SA 6.6, BR-23 |
| Chiều cao vai (cm) | Bắt buộc khi loài là chó, số > 0 | “Vui lòng nhập chiều cao của chó.” | SA 6.6 |
| Dịch vụ của lịch spa | Chọn ≥ 1 | “Vui lòng chọn ít nhất một dịch vụ.” | SA 6.6 |
| Ngày nhận / trả lưu trú | Trả sau nhận | “Ngày trả phải sau ngày nhận.” | SA 6.6 |
| Số tiền thực nhận | Số nguyên ≥ số tiền phải trả | “Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.” | SA 6.6, BR-17 |
| Giá, thời lượng, số nhân viên (MW-06) | Giá ≥ 0; thời lượng > 0; số nhân viên 1 hoặc 2; đủ mọi nhóm của loài áp dụng | “Thiếu giá/thời lượng cho nhóm <Vừa> của <Chó>.” · “Số nhân viên chỉ có thể là 1 hoặc 2.” | SA 6.6 |
| Mốc bắt đầu muộn nhất | Thuộc `Booking.SlotTimes` | “Vui lòng chọn mốc giờ hợp lệ.” | SA 6.6 |
| Ca làm (MW-12) | Giờ kết thúc sau giờ bắt đầu | “Giờ kết thúc phải sau giờ bắt đầu.” | SA 6.6 |
| Cấu hình (MW-13) | Hạn đổi/hủy 60 – 120; dọn dẹp 15 – 20; số nguyên khác ≥ 1; mốc `HH:mm` tăng dần; ngưỡng kích cỡ tăng dần; dung sai ≥ 0 | “Giá trị phải từ 60 đến 120 phút.” · “Giá trị phải từ 15 đến 20 phút.” | SA 6.6, openapi `ConfigSettings` |
| Mã chuồng | Bắt buộc, ≤ 20 ký tự | “Vui lòng nhập mã chuồng.” **(Đề xuất)** | openapi |
| Tệp ảnh | `image/*`, ≤ 50 MB | “Chỉ chấp nhận tệp ảnh.” | SA 6.6, API-Notes 4 |

Lỗi 400 `VALIDATION_ERROR` từ backend chưa có định dạng lỗi theo từng trường (mã hiện tại ghi “chưa được chốt”) → hiển thị `detail` trong `ErrorAlert` đầu form.

---

## 5. Lỗi từ backend và câu hiển thị

### 5.1 Quy tắc chung **(Hiện có trong `lib/api/errors.ts`, bổ sung phần còn thiếu)**

1. Mọi lỗi đã là `ApiError` (`kind`, `status`, `code`, `title`, `detail`).
2. `getErrorMessage(error)`: mất mạng → “Không kết nối được máy chủ, vui lòng thử lại.”; 5xx hoặc lỗi lạ → “Có lỗi xảy ra, vui lòng thử lại sau.” (không lộ chi tiết); 429 → “Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.”; 403 `FORBIDDEN` → “Bạn không có quyền xem trang này”; còn lại → `detail`, thiếu thì `title` của envelope, thiếu nữa thì câu dự phòng theo mã ở bảng 5.2.
3. **Vị trí hiển thị** theo bảng 5.2: dưới trường (`FieldError` qua `setError`), tại chỗ (`ErrorAlert`), toast lỗi (`useToast().showError` – thao tác không có chỗ đặt alert, ví dụ nút trong bảng), thay nội dung màn (`ForbiddenState`, `NotFoundState`), hộp thoại (`STAFF_OUT_OF_SHIFT`).
4. Câu **dưới trường** dùng câu cố định của SA 6.6 / UI demo (để giống thiết kế); câu **tại chỗ / toast** dùng `detail` của backend.
5. Sau lỗi 409: làm mất hiệu lực query liên quan để tải lại dữ liệu mới nhất (SA 6.6, FA 5.1).
6. Mã lỗi mới phải có trong `openapi.yaml` (và SA 5.1.2) trước, rồi thêm vào `ERROR_CODES` của cả 3 web.

### 5.2 Bảng mã lỗi → giao diện

| HTTP | `code` | Thường gặp ở | Hiển thị | Câu (dưới trường / dự phòng) | Sau đó |
| --- | --- | --- | --- | --- | --- |
| – | (mất mạng) | Mọi nơi | `ErrorAlert` / toast lỗi | “Không kết nối được máy chủ, vui lòng thử lại.” | Query tự thử lại (5xx, mạng) |
| 400 | `VALIDATION_ERROR` | Form | `ErrorAlert` đầu form | `detail` | Giữ dữ liệu |
| 401 | `UNAUTHENTICATED` | Đăng nhập | Alert lỗi vùng thông báo | “Thông tin đăng nhập không đúng.” (không nêu trường sai) | – |
| 401 | `UNAUTHENTICATED` | Khi đang dùng | – | “Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.” **(Đề xuất)** | Làm mới token một lần, thất bại → đăng nhập (FA 6.3) |
| 403 | `FORBIDDEN` | Tải màn / thao tác | `ForbiddenState` / toast lỗi | “Bạn không có quyền xem trang này” | – |
| 403 | `BOOKING_LOCKED` | CW-06, CW-07 | Alert danger trên tóm tắt + khóa nút gửi | “Tài khoản tạm thời không thể tự đặt lịch, vui lòng liên hệ cửa hàng qua hotline.” | – |
| 404 | `NOT_FOUND` | Chi tiết / thao tác | `NotFoundState` / toast lỗi | “Không tìm thấy dữ liệu, có thể đã bị thay đổi.” **(Đề xuất)** | Tải lại danh sách |
| 409 | `DUPLICATE_CONTACT` | CW-01, CW-13, MW-08 / SW-04 | Dưới ô số điện thoại | “Thông tin liên hệ này đã được sử dụng.” / SW-04: “Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.” | SW-04 hiện khách trùng |
| 409 | `SLOT_FULL` | CW-06, CW-10, SW-06, MW-05 | `ErrorAlert` tại bước chọn giờ | “Mốc giờ vừa kín, vui lòng chọn mốc khác.” | Về bước chọn giờ, tải lại mốc |
| 409 | `NO_CAPACITY` | CW-07, CW-10, SW-06, MW-05 | Alert “Hết chỗ” tại khối thời gian | “Hết chỗ trong thời gian này, vui lòng chọn ngày khác.” | Kiểm tra lại còn chỗ |
| 409 | `STAFF_CONFLICT` | MW-04, MW-05 | `ErrorAlert` / dưới ô nhân viên | “Có nhân viên đã có lịch trùng khung giờ.” | Tải lại đề xuất |
| 409 | `CAGE_CONFLICT` | MW-04, MW-05 | `ErrorAlert` | “Chuồng đã được gán trong thời gian này.” | Tải lại đề xuất, chuồng |
| 409 | `STAFF_COUNT_MISMATCH` | MW-04, MW-05 | `ErrorAlert` | “Lịch này cần đúng <n> nhân viên.” | – |
| 409 | `STAFF_OUT_OF_SHIFT` | MW-04, MW-05 | Hộp thoại xác nhận (MW-04·D2) | “Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?” | Đồng ý → gửi lại với `confirmOutOfShift: true` |
| 409 | `INVALID_TRANSITION` | Mọi thao tác đổi trạng thái | `ErrorAlert` / toast lỗi | `detail`; dự phòng “Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại.” **(Đề xuất)** | Tải lại chi tiết, danh sách |
| 409 | `CHANGE_WINDOW_CLOSED` | CW-09, CW-10 | Khóa nút Đổi/Hủy, lý do dưới nút | “Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline để được hỗ trợ.” | Tải lại chi tiết |
| 409 | `PHOTO_REQUIRED` | SW-11, MW-05 | Lý do dưới nút Bắt đầu / Hoàn tất | “Cần ảnh trước chăm sóc hợp lệ.” / “Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.” | Tải lại ảnh |
| 409 | `SERVICES_INCOMPLETE` | SW-11, MW-05 | Lý do dưới nút Hoàn tất | “Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.” | Tải lại chi tiết |
| 409 | `COST_CONFIRMATION_PENDING` | SW-07, SW-09, SW-11, MW-05 | Alert cảnh báo / lý do dưới nút | “Đang chờ khách xác nhận chi phí mới.” | Tải lại chi tiết |
| 409 | `COST_CONFIRMATION_EXPIRED` | CW-09, SW-07 | `ErrorAlert` | “Yêu cầu xác nhận chi phí đã hết hạn.” **(Đề xuất)** | Tải lại chi tiết |
| 409 | `PAYMENT_NOT_DUE` | SW-07, SW-09, SW-10, CW-09, MW-10 | `ErrorAlert`; SW-10 theo luồng thu phí trễ | `detail`; dự phòng “Khoản thanh toán chưa đến thời điểm ghi nhận.” **(Đề xuất)** | Tải lại khoản thanh toán |
| 409 | `AMOUNT_MISMATCH` | SW-09, MW-10·D1 | Dưới ô số tiền thực nhận | “Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.” | – |
| 409 | `SHIFT_OVERLAP` | MW-12 | `ErrorAlert` trong form ca | “Nhân viên đã có ca trong khoảng này.” | – |
| 409 | `SHIFT_HAS_APPOINTMENTS` | MW-12 | Alert cảnh báo trong form ca | “Còn lịch hẹn đã xác nhận trong ca này, hãy phân công lại trước.” | – |
| 409 | `CUSTOMER_NOT_LOCKED` | MW-09 | Toast lỗi | `detail` | Tải lại danh sách |
| 409 | `DUPLICATE_CAGE_CODE` | MW-07·D1 | Dưới ô mã chuồng | “Mã chuồng đã tồn tại.” | – |
| 429 | `RATE_LIMITED` | Đăng ký, đăng nhập, đặt lịch | Alert cảnh báo có đồng hồ | “Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.” | – |
| 5xx | – | Mọi nơi | `ErrorAlert` / toast lỗi | “Có lỗi xảy ra, vui lòng thử lại sau.” | Query tự thử lại |

---

## 6. Phản hồi cho người dùng

| Tình huống | Dùng | Ví dụ |
| --- | --- | --- |
| Thao tác ghi thành công | `useToast().showSuccess(câu)` – câu nêu kết quả, lấy theo UI demo | “Đã gửi yêu cầu đặt lịch LH-…”, “Đã lưu hồ sơ thú cưng” |
| Thao tác lỗi không có chỗ đặt alert | `useToast().showError(error)` (giữ đến khi đóng) | Lỗi khi bấm “Ngừng sử dụng” trong bảng |
| Cảnh báo nghiệp vụ trên màn | `Alert` (tone warn/info/success/danger) | Chờ xác nhận chi phí, còn chỗ / hết chỗ |
| Hành động nguy hiểm | `ConfirmDialog` tone danger (SA 6.6: hủy lịch, từ chối lịch, gỡ hồ sơ, vô hiệu hóa nhân viên) | CW-09·D1, MW-08·D2 |
| Nút không bấm được | `Button disabledReason="…"` | “Cần thu tiền lưu trú trước khi tiếp nhận.” |

Không dùng `window.alert`, `window.confirm`.

---

## 7. Định dạng, ngôn ngữ

- **Chỉ tiếng Việt**, không thư viện i18n. Câu chữ viết thẳng trong component hoặc hằng số của tính năng; nhãn enum chỉ lấy từ `lib/labels.ts` (UI-Screens 2.4).
- Hàm định dạng trong `lib/format.ts` **(Đề xuất)**, dùng `Intl` với `STORE_TIME_ZONE` (FA 8):

| Hàm | Kết quả | Ghi chú |
| --- | --- | --- |
| `formatMoney(270000)` | `270.000đ` | Số nguyên VND, dấu chấm hàng nghìn, “đ” liền sau số. |
| `formatDate(iso)` | `06/10/2026` | `dd/MM/yyyy`. |
| `formatShortDate(iso)` | `06/10` | Phiếu hẹn, bảng ca. |
| `formatWeekdayDate(iso)` | `T3 06/10` · `CN 11/10` | Dải ngày, cột bảng ca. |
| `formatLongDate(iso)` | `Thứ ba 06/10/2026` | Tiêu đề, chi tiết. |
| `formatTime(iso)` | `09:00` | 24 giờ. |
| `formatTimeRange(a, b)` | `09:00 – 11:00` | Gạch ngang dài có khoảng trắng hai bên. |
| `formatRelativeDay(iso)` | `Hôm nay` · `Hôm qua, 21:12` · `04/10, 08:30` | Thông báo, phiếu hẹn. |
| `formatWeight(9)` | `9,0 kg` | Một chữ số thập phân, dấu phẩy. |
| `formatPhone("0903412678")` | `0903 412 678` | Chỉ hiển thị; gửi API dạng liền. |
| `formatCountdown(sec)` | `29:41` | `mm:ss`. |
| `formatAppointmentCode(id)` | `LH-5F1C2A9B` | Tạm thời (UI-Screens 2.6, G-01). |

- Số trong bảng, tiền, giờ dùng `tabular-nums` (`.num`, `.money` của UI demo).
- Thời gian gửi API dựng bằng `lib/time.ts` (ISO 8601 có `+07:00`), không dùng `toISOString()` cho giá trị người dùng chọn (FA 8).

---

## 8. Danh sách, phân trang, lọc

- Trang bắt đầu từ 1 (`page`, `pageSize` – openapi `Page`, `PageSize`); `pageSize` mặc định 20 cho bảng, 100 cho danh sách trong ngày và danh mục nhỏ **(Đề xuất)**.
- Bộ lọc, tab, trang lưu trên URL (FA 4.1); đổi bộ lọc thì về trang 1.
- Lọc mà API chưa hỗ trợ (UI-Screens G-06, G-07, G-19) làm ở web **trên dữ liệu đã tải** và ghi chú `// Lọc ở web: API chưa có tham số … (UI-Screens G-06)` để dễ gỡ khi API bổ sung.
- Sắp xếp mặc định: lịch sắp tới theo giờ hẹn tăng dần; lịch sử, thông báo, thanh toán theo thời gian giảm dần.
- Danh sách rỗng hiện `EmptyState` (DS 4.1), không để vùng trống.

---

## 9. Style (TailwindCSS v4)

- **Chỉ dùng token** của `@theme` cho màu (`bg-lagoon`, `text-muted`, `border-line`, `bg-st-pending-bg`…). Mã màu viết thẳng chỉ cho giá trị UI demo chưa có token, kèm ghi chú nguồn; dùng lần thứ hai thì thêm token (DS 1).
- Cỡ chữ tiêu đề dùng thẻ `h1`/`h2`/`h3` (kiểu gốc đã có); nội dung không cần lớp cỡ chữ; chú thích `text-xs`.
- Bo góc, bóng, lớp theo DS 2.3 (`rounded-2xl` thẻ, `rounded-xl` thẻ chọn/alert, `rounded-[10px]` nút/ô nhập).
- Co giãn: desktop trước, biến thể `max-[1180px]:`, `max-[980px]:`, `max-[860px]:`, `max-[640px]:` (DS 6) **(Hiện có ở CW, SW)**.
- Chuỗi lớp dài hoặc dùng lại → hằng số trong cùng file (`navItemClass`, `dropdownItemClass`) **(Hiện có)**; ghép lớp có điều kiện bằng template string như mã hiện có, hoặc hàm `cn(...classes)` nhỏ trong `lib/cn.ts` (không thêm `clsx`/`tailwind-merge`) **(Đề xuất)**.
- Không dùng `style={{…}}` trừ giá trị tính lúc chạy (vị trí khối trên biểu đồ MW-02, độ rộng thanh tiến trình). Không dùng CSS module, styled-components. `globals.css` chỉ chứa `@theme`, `@layer base` và keyframes.
- Lớp tùy ý (`h-[68px]`, `max-w-[1200px]`) dùng cho số đo lấy từ UI demo không có trong thang Tailwind.

---

## 10. Trợ năng – tự kiểm trước khi mở PR

- Dùng được bằng bàn phím: Tab tới mọi nút, Enter/Space để bấm, Esc đóng hộp thoại/menu, focus nhìn thấy.
- Ô nhập có nhãn; lỗi gắn `aria-describedby`, `aria-invalid`.
- Nút chỉ có biểu tượng có `aria-label`; biểu tượng trang trí có `aria-hidden` (mặc định của `Icon`).
- Mục menu đang chọn có `aria-current="page"` **(Hiện có)**.
- Màu không phải cách duy nhất để hiểu thông tin (badge có chữ).
- Không cuộn ngang ở 1024px và 375px (DoD mục B).
Chi tiết: DS 7.

---

## 11. Danh sách cấm

| Không được | Thay bằng |
| --- | --- |
| Gọi `axios`/`fetch` trực tiếp trong component, hoặc tạo Axios instance khác | Hàm trong `lib/api/endpoints` qua `apiClient`, gọi qua hook trong `lib/queries` (ngoại lệ: route handler phiên – FA 6.2) |
| Gọi API trong `useEffect` | `useQuery` / `useMutation` |
| Dùng `any`, `@ts-ignore`, ép kiểu dữ liệu API bằng `as` | Kiểu từ `lib/api/types.ts`, `unknown` + thu hẹp |
| Viết mã màu, cỡ chữ, bo góc không theo token/DS | Token `@theme`, DS 2 |
| Thêm thư viện (UI, icon, form schema, ngày giờ, state…) khi nhóm chưa duyệt | Thành phần tự xây, `Intl`, React Hook Form, TanStack Query |
| Gửi `role`, `sizeGroup`, `status`, `amount` lên API; tự tính số tiền rồi gửi | Backend tính (FR-PAY-01); web chỉ tính để hiển thị tạm |
| Tin vào kiểm tra ở web để chặn quyền (ẩn nút = bảo mật) | Backend kiểm tra; web ẩn/hiện chỉ để dễ dùng |
| Lưu token vào `localStorage`/`sessionStorage`, ghi token/mật khẩu ra `console` | FA 6 |
| Đặt secret trong mã hoặc biến `NEXT_PUBLIC_*` | Secret chỉ ở backend |
| Viết chuỗi đường dẫn rời rạc (`"/lich-hen/" + id`) | `ROUTES` trong `lib/routes.ts` |
| Tự hủy lịch, tự đổi trạng thái ở web khi hết đồng hồ đếm ngược | Tải lại từ backend (SA 6.6) |
| Hiện chi tiết lỗi kỹ thuật (stack, thông báo tiếng Anh của server) | `getErrorMessage` |
| Dùng `window.alert` / `confirm` / `prompt` | Toast, `ConfirmDialog` |
| Import chéo giữa `features` | Đưa phần chung lên `components/domain` hoặc `lib` |
| Sửa file dùng chung ở một web mà không sửa 2 web còn lại | FA 3.3 |
| Để `console.log` khi mở PR | Xóa trước khi commit |
| Commit `.env.local`, `.next/`, `node_modules/` | `.gitignore` đã chặn **(Hiện có)** |

---

## 12. Git, PR và Definition of Done

Theo `Definition_of_Done_SE358.md` (nhóm đã duyệt):

| Hạng mục | Quy ước |
| --- | --- |
| Nhánh | `feature/<ID thẻ>-<mo-ta-khong-dau>` tạo từ `develop` mới nhất; sống tối đa 3 ngày. |
| Commit | `<loại>(<ID>): <nội dung>`, loại là `feat`, `fix`, `refactor`, `test`, `docs`. Ví dụ `feat(120): dựng thanh trên Web Nhân viên theo ui-demo`. |
| PR | Vào `develop`; tiêu đề `[<ID>] <WBS> <Tên thẻ>`; mô tả 4 phần: **Tóm tắt**, **Kiểm thử** (lệnh đã chạy, kịch bản đã thử), **Ghi chú cho người review**, **Link Trello**. |
| Duyệt | Ít nhất 1 Approve từ người FE khác (Long, Giang, Vinh); người viết không tự merge; Khôi merge. |
| Trello | In Progress → Review (dán link PR) → Done (sau khi merge, Vinh kiểm DoD). |
| Kiểm tra web (DoD B) | `npm run lint`, `npx tsc --noEmit`, `npm run build` sạch; giao diện bám UI demo và SA 6.1; không cuộn ngang ở 1024px, 375px; gọi backend qua `apiClient`, lỗi theo error envelope; không gửi số tiền, vai trò, nhóm kích cỡ, trạng thái; màn có API đã chạy với backend thật hoặc PR ghi rõ đang dùng dữ liệu giả và thẻ nào sẽ nối API thật; liệt kê FR của thẻ (thẻ không có FR ghi “không có FR”). |

Mô tả PR nên ghi thêm: mã màn đã làm (CW/SW/MW-xx), các mục **(Đề xuất)** / **G-xx** của UI-Screens đã áp dụng.

---

## 13. Module mẫu (golden sample – #16)

Chưa có module mẫu. Đề xuất chọn **“Thú cưng của tôi” (CW-04 + CW-05 + CW-04·D1) trên `customer-web`** làm mẫu vì đi qua đủ các tầng: danh sách có trạng thái rỗng, form tạo/sửa có kiểm tra dữ liệu, hộp thoại xác nhận nguy hiểm, 3 kiểu gọi API (đọc, ghi, xóa), xử lý lỗi, toast **(Đề xuất)**. Khi viết xong và được duyệt kỹ, cập nhật mục này thành “module Thú cưng là mẫu” và liệt kê file:

```
app/(main)/thu-cung/page.tsx, app/(main)/thu-cung/them/page.tsx, app/(main)/thu-cung/[petId]/sua/page.tsx
features/pets/screens/pets-screen.tsx, features/pets/screens/pet-form-screen.tsx
features/pets/components/pet-card.tsx, features/pets/forms.ts
lib/api/endpoints/pets.ts, lib/queries/pets.ts, lib/api/types.ts (Pet, PetRequest, PetSizeResult, PetPage)
components/ui/{button,card,field,input,modal}.tsx, components/domain/pet-avatar.tsx
```

Viết màn mới thì đọc module mẫu trước và viết theo cùng cách.

---

## 14. Điểm cần chốt

| # | Vấn đề | Đề xuất | Mục |
| --- | --- | --- | --- |
| C-01 | Thư viện schema cho form | Không thêm; dùng luật của React Hook Form. | 4.1 |
| C-02 | Định dạng số điện thoại hợp lệ | 10 chữ số, bắt đầu bằng 0, bỏ khoảng trắng trước khi gửi. | 4.2 |
| C-03 | Các câu mới (hết phiên, không tìm thấy, chưa đến thời điểm thanh toán, hết hạn xác nhận…) | Như bảng 5.2. | 5.2 |
| C-04 | Hàm `cn` ghép lớp | Viết hàm nhỏ trong `lib/cn.ts`, không thêm thư viện. | 9 |
| C-05 | Module mẫu | Thú cưng (CW-04, CW-05) trên `customer-web`. | 13 |
