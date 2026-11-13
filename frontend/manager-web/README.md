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
| `features/services` | Màn MW-06 Danh mục dịch vụ: bảng, ngăn kéo thêm/sửa, hộp thoại ngừng cung cấp |
| `features/cages` | Màn MW-07 Chuồng và giá lưu trú: tab Chuồng (hộp thoại thêm/sửa, ngừng/mở lại), tab Giá lưu trú và phí trả muộn |
| `features/pending` | Màn MW-04 Chờ xác nhận: bộ lọc loại lịch, danh sách phiếu hẹn sắp theo giờ hẹn, đầu thẻ chi tiết và hồ sơ thú cưng chỉ xem; lịch lưu trú: thông tin lịch + tạm tính, chuồng đề xuất, xác nhận và từ chối; lịch spa: thông tin lịch + tạm tính, nhân viên đề xuất và điều chỉnh, xác nhận (kèm hộp thoại nhân viên ngoài ca) và từ chối (`RejectAppointmentDialog` dùng chung cho cả hai loại lịch) |
| `app/globals.css` | Token màu, chữ theo System Analysis mục 6.1 |
| `components/layout` | Thanh bên của web quản lý: menu, số lịch chờ xác nhận, khối tài khoản |
| `components/feedback` | Hiển thị lỗi và ghi chú: `Alert` (tông danger, info), `ErrorAlert`, `ForbiddenState`, `NotFoundState`, `FieldError`, toast |
| `components/ui`, `components/domain` | Thành phần dùng chung: Button, Card, Skeleton, Field/Input/Select/Textarea, Tag, EmptyState, ConfirmDialog, Drawer, PetAvatar, SegmentedControl, StatusBadge, AppointmentTicket |
| `lib/queries` | Hook TanStack Query theo từng nhóm endpoint (`useServices`, `useCreateService`, …) |
| `lib/number-input.ts`, `lib/size-groups.ts` | Đọc số người dùng nhập (`toWholeNumber`), nhóm kích cỡ theo loài (BR-19) và khung bảng giá loài × nhóm; dùng chung cho form dịch vụ và giá lưu trú |
| `lib/labels.ts`, `lib/format.ts`, `lib/time.ts` | Nhãn tiếng Việt cho enum (loài, nhóm kích cỡ, tính cách, loại và trạng thái lịch hẹn), định dạng hiển thị và ngày giờ theo múi giờ cửa hàng |
| `lib/api` | `apiClient` (Axios), chuẩn hóa error envelope thành `ApiError`, kiểu dữ liệu và hàm gọi endpoint |
| `lib/auth` | Phiên đăng nhập: token trong bộ nhớ, làm mới token, `SessionGate`, `useSession` |
| `proxy.ts` | Chuyển hướng theo cookie phiên: chưa đăng nhập → `/dang-nhap` |
| `lib/routes.ts` | Đường dẫn các màn hình MW-01 → MW-13 (User-Flows mục 2.3) |

## Thanh bên

- Thứ tự, nhãn, biểu tượng theo `.side-nav` của ui-demo (`NAV_ITEMS` trong `components/layout/sidebar-nav.tsx`).
- Lịch spa và lưu trú chung một màn MW-03 `/lich-hen` (lọc bằng `?type=`); tình trạng chuồng nằm trong MW-07.
- Số lịch chờ xác nhận: `ActiveSidebarNav` gọi `GET /appointments?status=Pending&page=1&pageSize=1` lấy `total` (làm mới 60 giây/lần, chỉ sau khi có phiên); chưa có số hoặc lỗi thì ẩn huy hiệu.
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

## Danh mục dịch vụ (MW-06)

- Gọi `GET/POST /services`, `PUT /services/{id}`, `PATCH /services/{id}/status`; Quản lý nhận cả dịch vụ đã ngừng. "Ngừng cung cấp" và "Mở lại" cùng gọi `PATCH` với `isActive` là `false` / `true`.
- Mốc "Bắt đầu muộn nhất" chọn trong `SLOT_TIME_OPTIONS` (`features/services/forms.ts`): tạm là mặc định của `Booking.SlotTimes` vì backend chưa có `GET /config`. Khi có API này thì đọc từ `settings["Booking.SlotTimes"]`; backend vẫn kiểm tra lại.
- Chuột lang chỉ có hai nhóm kích cỡ Nhỏ và Lớn (BR-19); chó, mèo, thỏ có ba nhóm.

## Chuồng và giá lưu trú (MW-07)

- Tab Giá: `GET/PUT /hotel/pricing`. Chỉ gửi nhóm đã nhập đủ cả hai ô; nhóm chưa có giá có thể để trống, nhóm đã có giá không được để trống (backend chỉ có `PUT`, không có thao tác xóa giá). Phí trả muộn (`lateFeePerBlock`) luôn bắt buộc.
- Tab Chuồng: `POST /cages`, `PUT /cages/{id}`, `PATCH /cages/{id}/status`; mã trùng (409 `DUPLICATE_CAGE_CODE`) báo dưới ô Mã.
- Chú thích phí trả muộn (miễn phí 30 phút đầu, mỗi 60 phút tính 1 lần) dùng `LATE_GRACE_MINUTES` / `LATE_BLOCK_MINUTES` trong `features/cages/forms.ts`: tạm là mặc định của `Hotel.LateGraceMinutes` / `Hotel.LateBlockMinutes` vì backend chưa có `GET /config` (chưa thẻ nào làm MW-13). Quản lý đổi được hai mốc này ở Cấu hình nên chú thích có thể lệch; khi có `GET /config` thì đọc từ `settings[...]`.
- Phí trả muộn chưa thiết lập (chưa có giá nào và `lateFeePerBlock` = 0) thì ô phí để trống để Quản lý phải nhập; ô giá hiện dấu chấm hàng nghìn (`180.000`) khi nạp từ backend.
- Form giá đi theo dữ liệu backend (`values` + `keepDirtyValues` của React Hook Form): refetch cập nhật các ô chưa sửa, giữ ô đang gõ dở.
- Tạm thời: backend chưa có `GET /cages` (FR-HTL-08, thẻ 88) nên bảng chuồng chỉ liệt kê chuồng đã thêm/sửa trong lần mở trang (state trong `CagesScreen`, mất khi tải lại). Thẻ 150 nối `GET /cages`: thay danh sách này, thêm 4 thẻ số liệu, cột "Đang chứa", tổng số chuồng trên tab và tải lại danh sách sau khi ghi (`lib/queries/cages.ts`).
- Cả hai tab luôn được dựng (tab không chọn bị ẩn bằng `hidden`) nên đổi tab không mất danh sách chuồng hay giá đang nhập. Chưa làm (Đề xuất trong UI-Screens): hỏi xác nhận khi rời trang hoặc tải lại lúc có giá chưa lưu.

## Xác nhận và từ chối lịch lưu trú (MW-04, thẻ 145)

- Chọn lịch lưu trú ở `/cho-xac-nhan`: `GET /appointments/{id}/suggestions` (`useHotelSuggestions`) trả `{ cage }`; `cage` là `null` khi không còn chuồng phù hợp thì nút "Xác nhận lịch lưu trú" bị khóa, chỉ còn "Từ chối".
- Xác nhận: `POST /appointments/{id}/confirm` chỉ gửi `{ cageId }` (không gửi số tiền, trạng thái, nhóm kích cỡ). Từ chối: `POST /appointments/{id}/reject` không body (`RejectAppointmentDialog`, dùng chung cho lịch spa ở thẻ 144).
- Tạm thời chỉ hiện chuồng hệ thống đề xuất, chưa chọn chuồng khác vì backend chưa có `GET /cages` (thẻ 88; UI-Screens G-08). Thẻ 150 nối `GET /cages` thì thêm danh sách chuồng vào `HotelCageSection`.
- "Tạm tính" tính ở web (`features/pending/hotel-stay.ts`) từ `GET /hotel/pricing` và hồ sơ thú cưng chỉ để hiển thị; số tiền thật do backend tính (BR-22, BR-26).
- Lỗi 409: `CAGE_CONFLICT` hiện `ErrorAlert` trong thẻ rồi tải lại đề xuất chuồng; `INVALID_TRANSITION` hiện toast lỗi rồi tải lại danh sách chờ và huy hiệu.
- Sau khi xác nhận hoặc từ chối: `PendingScreen.handleProcessed` đổi `?appointmentId=` sang lịch kế tiếp bằng History API (không chờ máy chủ), gỡ lịch khỏi cache rồi tải lại danh sách và huy hiệu.
