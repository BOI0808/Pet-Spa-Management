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
| `components/ui` | Thành phần cơ bản: `Button`, `Field` + `Input`, `Card`, `Avatar`, `Skeleton` |
| `components/domain` | Thành phần nghiệp vụ: `PetAvatar` |
| `components/layout` | Thanh trên của web khách hàng, `AuthLayout` của màn đăng nhập/đăng ký |
| `components/feedback` | Hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `FieldError`, toast |
| `features/<tính năng>` | Màn hình theo tính năng (`auth`, `profile`) và luật form (`forms.ts`) |
| `lib/api` | `apiClient` (Axios), chuẩn hóa error envelope thành `ApiError`, kiểu (`types.ts`), hàm gọi API (`endpoints/`) |
| `lib/queries` | Hook TanStack Query theo tài nguyên |
| `lib/auth` | Phiên đăng nhập: access token trong bộ nhớ, `SessionProvider`, `SessionGate` |
| `lib/routes.ts` | Đường dẫn các màn hình |
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
