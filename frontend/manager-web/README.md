# Web quản lý – Spa thú cưng

Next.js (App Router, TypeScript), TailwindCSS, Axios, TanStack Query, React Hook Form (WBS 1.7).

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
| `app/(main)` | Các màn hình có thanh bên (MW-02 → MW-13) |
| `app/(auth)` | Màn hình không có thanh bên (MW-01 Đăng nhập) |
| `app/api/session` | Route handler phiên đăng nhập: `login`, `refresh`, `logout` (cookie httpOnly) |
| `features/auth` | Màn MW-01 Đăng nhập |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 |
| `components/layout` | Thanh bên của web quản lý: menu, số lịch chờ xác nhận, khối tài khoản |
| `components/feedback` | Hiển thị lỗi: `ErrorAlert`, `ForbiddenState`, `FieldError`, toast |
| `lib/api` | `apiClient` (Axios), chuẩn hóa error envelope thành `ApiError`, kiểu dữ liệu và hàm gọi endpoint |
| `lib/auth` | Phiên đăng nhập: token trong bộ nhớ, làm mới token, `SessionGate`, `useSession` |
| `proxy.ts` | Chuyển hướng theo cookie phiên: chưa đăng nhập → `/dang-nhap` |
| `lib/routes.ts` | Đường dẫn các màn hình MW-01 → MW-13 (User-Flows mục 2.3) |

## Thanh bên

- Thứ tự, nhãn, biểu tượng theo `.side-nav` của ui-demo (`NAV_ITEMS` trong `components/layout/sidebar-nav.tsx`).
- Lịch spa và lưu trú chung một màn MW-03 `/lich-hen` (lọc bằng `?type=`); tình trạng chuồng nằm trong MW-07.
- Số lịch chờ xác nhận (`pendingCount`) đang để `null` nên chưa hiện; thẻ 1.7.4.1 lấy số này từ API.
- Khối tài khoản hiện `userName` của `GET /me`; nút đăng xuất gọi `POST /api/session/logout`.
- Dưới 980px thanh bên thành thanh ngang cuộn được.

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

## Phiên đăng nhập

Chạy được khi backend đang chạy và đã có tài khoản Quản lý (`Seed__ManagerUserName`, `Seed__ManagerPassword`).

- Refresh token nằm trong cookie httpOnly `ps_rt` do route handler `app/api/session/*` đặt; access token chỉ giữ trong bộ nhớ.
  Không lưu token vào `localStorage` / `sessionStorage`.
- `apiClient` tự gắn `Authorization: Bearer`, gặp 401 thì làm mới token một lần rồi gửi lại; làm mới bị từ chối thì về `/dang-nhap`.
- `proxy.ts` chuyển hướng theo cookie; `SessionGate` (trong `app/(main)/layout.tsx`) kiểm tra phiên và vai trò thật.
  Chỉ vai trò `Manager` được dùng web này (`ALLOWED_ROLE` trong `lib/auth/config.ts`).
- Khi chạy cả 3 web trên `localhost`, cookie `ps_rt` dùng chung (cookie không tách theo cổng): thử từng web một.
- Route handler chuyển tiếp `X-Forwarded-For` lên backend để giới hạn tốc độ theo từng người dùng. Khi triển khai, web phải nằm sau proxy đặt header này (Vercel đã làm); chạy local thì mọi người dùng chung một IP.
- Việc làm mới token được xếp hàng giữa các tab bằng `navigator.locks`: hai tab dùng chung một refresh token thì backend sẽ thu hồi cả phiên.
- `SessionGate` chỉ giữ khung xương khi 401/403; lỗi khác (mất mạng, 429, 5xx…) hiện `ErrorAlert` kèm nút Thử lại.
