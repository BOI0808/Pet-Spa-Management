# Web khách hàng – Spa thú cưng

Next.js (App Router, TypeScript), TailwindCSS, Axios, TanStack Query, React Hook Form (WBS 1.5).

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

Kiểm tra trước khi tạo PR: `npm run lint` và `npm run build`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `app/(auth)` | Màn không có khung: đăng nhập (CW-02), đăng ký (CW-01) |
| `app/(main)` | Các màn hình có thanh trên (CW-03 → CW-13), bọc trong `SessionGate` |
| `app/api/session` | Route handler phiên đăng nhập: `login`, `refresh`, `logout` |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 |
| `components/ui` | Thành phần cơ bản: `Button`, `ButtonLink`, `Field` + `Input`/`Textarea`, `FieldSet`, `ChoiceCard`, `SegmentedControl`, `Card`, `Tag`, `Modal`/`ConfirmDialog`, `EmptyState`, `Avatar`, `Skeleton`, `Badge`, `Tabs`, `FilterChip`, `Pager`, `KeyValue`/`DescriptionList` |
| `components/domain` | Thành phần nghiệp vụ: `PetAvatar`, `PetLine`, `Stepper`, `DateStrip`, `SlotPicker`, `ServiceOption`, `SumLine`/`SumFact`/`SumTotal`, `StatusBadge`/`PaymentBadge`, `AppointmentTypeLabel`, `AppointmentTicket`, `Lifecycle`, `ServiceTask` |
| `components/layout` | Thanh trên của web khách hàng, `PageHeader` (đường dẫn + tiêu đề), `AuthLayout` của màn đăng nhập/đăng ký |
| `components/feedback` | `Alert`, `Countdown` (đếm ngược tới `expiresAt`), hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `NotFoundState`, `FieldError`, toast |
| `features/<tính năng>` | Màn hình theo tính năng (`appointments`, `auth`, `booking`, `home`, `pets`, `profile`) và luật form (`forms.ts`) |
| `lib/api` | `apiClient` (Axios), chuẩn hóa error envelope thành `ApiError`, kiểu (`types.ts`), hàm gọi API (`endpoints/`) |
| `lib/queries` | Hook TanStack Query theo tài nguyên |
| `lib/auth` | Phiên đăng nhập: access token trong bộ nhớ, `SessionProvider`, `SessionGate` |
| `lib/routes.ts` | Đường dẫn các màn hình |
| `lib/labels.ts` | Nhãn hiển thị của enum API (loài, nhóm kích cỡ, tính cách, nhóm mốc giờ, trạng thái lịch hẹn, lý do hủy, khoản thanh toán – UI-Screens 2.4) |
| `lib/time.ts` | Ngày giờ theo múi giờ cửa hàng, dựng ISO 8601 có `+07:00` (Frontend-Architecture 8) |
| `proxy.ts` | Chuyển hướng lạc quan theo cookie phiên |

## Phiên đăng nhập

Theo đề xuất ở Frontend-Architecture mục 6 (R-01):

- Access token chỉ nằm trong bộ nhớ trình duyệt; refresh token nằm trong cookie httpOnly `ps_rt` do route handler
  `app/api/session/*` đặt, trang không đọc được. Không lưu token vào `localStorage`/`sessionStorage`.
- `proxy.ts`: chưa có cookie mà mở màn có khung → `/dang-nhap?next=…`; có cookie mà mở `/dang-nhap`, `/dang-ky` → trang đích.
- `SessionGate`: tải lại trang thì lấy access token mới qua `POST /api/session/refresh`, rồi `GET /me`; chỉ hiện màn khi
  vai trò là `Customer`.
- `apiClient` gặp 401 thì làm mới token một lần rồi gửi lại request; làm mới thất bại thì về đăng nhập kèm `?next=`.
- Các màn trong `app/(main)` đặt `export const instant = false` (xem ghi chú trong `app/(main)/layout.tsx`).

## Gọi API và hiển thị lỗi

- Mọi lời gọi backend dùng `apiClient`; lỗi trả ra luôn là `ApiError` (`kind`, `status`, `code`, `title`, `detail`).
- `getErrorMessage(error)` trả câu hiển thị theo mục 6.6: mất mạng / 5xx → câu chung, 429 → nhắc thử lại sau,
  403 `FORBIDDEN` → không có quyền, còn lại → `detail` (thiếu thì `title`) của envelope.
- 409: dùng `<ErrorAlert error={error} />` ngay tại chỗ thao tác rồi tải lại dữ liệu liên quan.
- 403: dùng `<ForbiddenState />` thay cho nội dung trang (kiểm tra bằng `isForbiddenError`).
- Kết quả tức thời: `useToast().showSuccess(...)` (tự ẩn) hoặc `useToast().showError(error)` (giữ đến khi đóng).
- Lỗi của ô nhập (React Hook Form): `<FieldError id="..." message={errors.field?.message} />`.
- TanStack Query không thử lại lỗi 4xx.

## Đổi, hủy lịch hẹn (CW-09 vùng 8, CW-10)

- Khách chỉ tự đổi/hủy lịch `Pending`/`Confirmed` (BR-14). Hạn tự đổi/hủy cấu hình 60–120 phút trước giờ hẹn (BR-08)
  nhưng khách không đọc được `GET /config` (UI-Screens G-03), nên `features/appointments/change-window.ts`:
  - còn dưới 60 phút trước giờ hẹn → khóa trước ở web (quá hạn với mọi cấu hình);
  - từ 60 phút trở lên → bật nút; backend trả 409 `CHANGE_WINDOW_CLOSED` thì khóa và hiện lý do hotline (FR-CHG-02).
- Lịch đã biết quá hạn nhờ 409 được ghi ở `lib/queries/appointment-changes.ts` (bộ nhớ truy vấn + `sessionStorage`,
  chỉ là cờ hiển thị) để CW-09 và CW-10 cùng khóa, kể cả khi tải lại trang.
- `GET /spa/slots` và `GET /hotel/availability` vẫn tính chỗ chính lịch đang đổi: CW-10 cho chọn lại mốc giờ hiện tại
  của lịch spa, và với lịch lưu trú báo “Chưa chắc còn chỗ” (vẫn cho gửi) khi thời gian mới trùng các đêm hiện tại.
  Hết chỗ thật thì backend trả 409 `SLOT_FULL` / `NO_CAPACITY`.
