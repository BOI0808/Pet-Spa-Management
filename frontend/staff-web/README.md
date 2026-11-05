# Web nhân viên – Spa thú cưng

Next.js (App Router, TypeScript), TailwindCSS, Axios, TanStack Query, React Hook Form (WBS 1.6).
Dùng cho lễ tân (LT) và nhân viên spa (NVS); cùng một khung, menu hiển thị theo vai trò.

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền NEXT_PUBLIC_API_BASE_URL
npm run dev                  # http://localhost:3000
```

Kiểm tra trước khi tạo PR: `npm run lint`, `npx tsc --noEmit` và `npm run build`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `app/(auth)` | SW-01 Đăng nhập (không có thanh trên) |
| `app/(main)` | Các màn hình có thanh trên (SW-02 → SW-15), nằm sau `SessionGate` |
| `app/api/session` | Route handler phiên đăng nhập: `login`, `refresh`, `logout` (cookie httpOnly) |
| `proxy.ts` | Chuyển hướng theo cookie phiên: chưa đăng nhập → `/dang-nhap` |
| `features/auth` | Màn SW-01 và quy tắc kiểm tra form đăng nhập |
| `lib/auth` | Phiên đăng nhập: token trong bộ nhớ, làm mới token, `SessionGate`, `useSession` |
| `next.config.ts` | Chuyển `/` về SW-02 Lịch hẹn (`redirects`) |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 |
| `components/layout` | Thanh trên của web nhân viên, menu thả xuống |
| `components/feedback` | Hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `FieldError`, toast |
| `lib/api` | `apiClient` (Axios) và chuẩn hóa error envelope thành `ApiError` |
| `lib/routes.ts` | Đường dẫn các màn hình SW-01 → SW-15 |
| `lib/staff-role.ts` | Vai trò nhân viên: lễ tân, nhân viên spa |
| `lib/route-access.ts` | Vai trò được vào từng màn hình (`ROUTE_ROLES`) |

## Phiên đăng nhập

Chạy được khi backend đang chạy và đã có tài khoản nhân viên (quản lý tạo ở Web quản lý).

- Refresh token nằm trong cookie httpOnly `ps_rt_staff` do route handler `app/api/session/*` đặt; access token chỉ giữ trong bộ nhớ.
  Không lưu token vào `localStorage` / `sessionStorage`.
- `apiClient` tự gắn `Authorization: Bearer`, gặp 401 thì làm mới token một lần rồi gửi lại; làm mới bị từ chối thì về `/dang-nhap`.
- `proxy.ts` chuyển hướng theo cookie; `SessionGate` (trong `app/(main)/layout.tsx`) kiểm tra phiên và vai trò thật qua `GET /me`.
- Chỉ tài khoản `role = Staff` có `staffRole` (`Receptionist` hoặc `SpaStaff`) được dùng web này (`isStaffAccount` trong `lib/auth/config.ts`).
  Đăng nhập đúng mật khẩu nhưng sai vai trò thì thu hồi token, không đặt cookie và báo "Tài khoản không có quyền truy cập web này".
- Cookie không tách theo cổng, nên mỗi web cần tên cookie riêng để chạy cả 3 web trên `localhost` cùng lúc. Nếu trùng tên,
  mở web này sẽ thấy cookie của web kia sai vai trò và thu hồi phiên của web kia; khóa `navigator.locks` cũng tách theo cổng,
  nên hai web làm mới cùng một refresh token có thể khiến backend thu hồi mọi phiên của tài khoản.
  Web nhân viên dùng `ps_rt_staff`; Web khách hàng và Web quản lý hiện cùng dùng `ps_rt`.
- Route handler chuyển tiếp `X-Forwarded-For` lên backend để giới hạn tốc độ theo từng người dùng. Khi triển khai, web phải nằm sau proxy đặt header này (Vercel đã làm); chạy local thì mọi người dùng chung một IP.
- Việc làm mới token được xếp hàng giữa các tab bằng `navigator.locks`: hai tab dùng chung một refresh token thì backend sẽ thu hồi cả phiên.
- Các màn trong `app/(main)` đặt `export const instant = false` (xem ghi chú trong `app/(main)/layout.tsx`).

## Menu và màn hình theo vai trò

- `ROUTE_ROLES` (`lib/route-access.ts`) khai báo vai trò được vào từng màn, theo Authorization mục 9. Menu (`NAV_ITEMS` trong
  `components/layout/header-nav.tsx`) và `SessionGate` cùng đọc bảng này.
- Chưa biết vai trò (đang tải `GET /me`) thì menu hiện khung xương, không hiện mục nào.
- Lễ tân hoặc nhân viên spa gõ thẳng đường dẫn của vai trò kia thì `SessionGate` hiện `ForbiddenState`. Việc này chỉ chạy khi trang
  đã tồn tại; đường dẫn chưa có trang thì Next.js trả 404.
- Ẩn menu và chặn màn chỉ là giao diện; quyền thật luôn do backend kiểm tra.

## Gọi API và hiển thị lỗi

Phần này giống Web khách hàng để 3 web dùng chung một cách:

- Mọi lời gọi backend dùng `apiClient`; lỗi trả ra luôn là `ApiError` (`kind`, `status`, `code`, `title`, `detail`).
- `getErrorMessage(error)` trả câu hiển thị theo mục 6.6: mất mạng / 5xx → câu chung, 429 → nhắc thử lại sau,
  403 `FORBIDDEN` → không có quyền, còn lại → `detail` (thiếu thì `title`) của envelope.
- 409: dùng `<ErrorAlert error={error} />` ngay tại chỗ thao tác rồi tải lại dữ liệu liên quan.
- 403: dùng `<ForbiddenState />` thay cho nội dung trang (kiểm tra bằng `isForbiddenError`).
- Kết quả tức thời: `useToast().showSuccess(...)` (tự ẩn) hoặc `useToast().showError(error)` (giữ đến khi đóng).
- Lỗi của ô nhập (React Hook Form): `<FieldError id="..." message={errors.field?.message} />`.
- TanStack Query không thử lại lỗi 4xx.
