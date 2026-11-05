# Design System – Hệ thống quản lý spa thú cưng

*Màu, chữ, khoảng cách, thành phần dùng chung và quy tắc co giãn, trợ năng cho 3 web* · Phiên bản 1.0 · Ngày lập: 21/10/2026

**Nguồn:** *System Analysis & UI Design v1.3* (**SA**: 6.1, 6.6), **UI demo** `docs/SE358_PetSpa_UI_Demo.html` (mục OV-02 “Hệ thống thiết kế dùng chung” và CSS trong `<style>`), mã nguồn `frontend/*/app/globals.css`, `components/` trên nhánh `develop`.
**Nhãn:** **(Đề xuất)** tài liệu này đề xuất, chờ nhóm duyệt.
**Chuẩn:** UI demo là chuẩn về giá trị (màu, cỡ, khoảng cách); tài liệu này ghi lại giá trị đó dưới dạng token Tailwind và thành phần React để 3 web dùng giống nhau.

---

## 1. Nguyên tắc

1. **Một hệ thống cho 3 web.** Cùng token, cùng thành phần; chỉ khác khung: web khách hàng dùng thanh trên sáng, hai web nội bộ (nhân viên, quản lý) dùng khung Lagoon đậm để nhân viên nhận ra ngay đang ở công cụ làm việc (UI demo OV-02).
2. **Không dùng thư viện giao diện ngoài.** Thành phần tự xây trên TailwindCSS v4, mọi tài nguyên miễn phí (SA 6.1, X-07). Không thêm shadcn/ui, MUI, Ant Design, thư viện biểu tượng… nếu nhóm chưa duyệt.
3. **Dùng token, không viết mã màu trong thành phần.** Mọi màu đi qua token ở mục 2.1 (`bg-lagoon`, `text-muted`…). Mã màu viết thẳng chỉ được phép cho giá trị UI demo chưa có token và phải ghi chú nguồn (ví dụ `border-[#EFC3BE]` của alert lỗi) – khi dùng lần thứ hai thì thêm token.
4. **Màu luôn đi kèm chữ.** Trạng thái, cảnh báo không chỉ dựa vào màu (SA 6.1).
5. **Mỗi màn hình tối đa một nút chính** (Primary) (SA 6.1).
6. **Thành phần có sẵn trước, viết mới sau.** Trước khi tạo thành phần, tra mục 4; thấy thiếu thì thêm vào `components/ui` hoặc `components/domain` cho cả 3 web (Frontend-Architecture mục 3).

---

## 2. Design tokens

Token khai báo trong `app/globals.css` của từng web bằng `@theme` (Tailwind v4); tên token sinh ra lớp tiện ích tương ứng (`--color-lagoon` → `bg-lagoon`, `text-lagoon`, `border-lagoon`…). Giá trị dưới đây đã có trong `customer-web` và `staff-web`; `manager-web` hiện mới có một phần (mục 9).

### 2.1 Màu

| Token (`--color-…`) | Giá trị | Tương phản | Dùng cho |
| --- | --- | --- | --- |
| `lagoon` | #0B6E78 | chữ trắng 5,97:1 | Nút chính, liên kết, mục đang chọn, viền focus |
| `lagoon-700` | #084F57 | chữ trắng 9,27:1 | Hover/pressed của nút chính; nền thanh trên web nhân viên; chữ trên nền Lagoon nhạt |
| `lagoon-800` | #063F45 | – | Nền thanh bên web quản lý |
| `lagoon-50` | #DDF1F2 | chữ `lagoon-700` đạt | Nền mục đang chọn, badge “Đang thực hiện” |
| `lagoon-25` | #EEF8F8 | – | Nền thẻ chọn đang chọn, nút phụ khi hover, cuống phiếu hẹn spa |
| `apricot` | #F5A524 | chữ `ink` 6,65:1 | Điểm nhấn: “Hệ thống đề xuất”, số chờ xử lý, chấm logo. **Không dùng làm màu chữ trên nền trắng.** |
| `apricot-50` | #FFF4DC | – | Nền thẻ “Khách vãng lai”, “Ngoài ca làm”, thẻ số liệu nhấn |
| `apricot-100` | #FCE6B6 | – | Nền avatar mặc định |
| `apricot-700` | #7A4B00 | – | Chữ trên nền Apricot nhạt |
| `ink` | #14323A | 13,57:1 trên trắng | Chữ chính, nền toast, chip đang chọn |
| `muted` | #5B7178 | 5,15:1 trên trắng | Chữ phụ, nhãn, chú thích |
| `mist` | #F5F9FA | – | Nền trang, nền ô thông tin phụ, hover dòng bảng |
| `line` | #D6E4E7 | – | Viền ô nhập, thẻ, đường kẻ |
| `line-soft` | #E8F0F2 | – | Đường kẻ trong thẻ, nền thẻ trung tính |
| `success` / `success-50` | #237A47 / #E4F3E9 | chữ trắng 5,32:1 | Thành công, bước đã xong, “Đã thanh toán”, chuồng trống |
| `danger` / `danger-50` | #B3372B / #FBEAE8 | chữ trắng 6,00:1 | Lỗi, hủy, từ chối, nút Danger |
| `info` / `info-50` | #2F6FB5 / #E7EFFA | chữ trắng 5,17:1 | Thông tin, liên kết phụ |

**Màu trạng thái lịch hẹn** (luôn đi kèm chữ; badge có chấm tròn cùng màu chữ):

| Trạng thái (`AppointmentStatus`) | Lớp UI demo | Token nền / chữ | Giá trị | Tương phản |
| --- | --- | --- | --- | --- |
| Chờ xác nhận (`Pending`) | `st-1` | `st-pending-bg` / `st-pending` | #FFF1CC / #7A4B00 | 6,60:1 |
| Đã xác nhận (`Confirmed`) | `st-2` | `st-confirmed-bg` / `st-confirmed` | #DCE9F8 / #1F4E8C | 6,75:1 |
| Đã tiếp nhận (`Received`) | `st-3` | `st-received-bg` / `st-received` | #E6E4FA / #3E3A8F | 7,63:1 |
| Đang thực hiện / Đang lưu trú (`InProgress`, `InStay`) | `st-4` | `st-active-bg` / `st-active` | #DDF1F2 / #0B6E78 | 5,10:1 |
| Hoàn tất (`Completed`) | `st-5` | `st-completed-bg` / `st-completed` | #DDF1DD / #1E6B3C | 5,49:1 |
| Đã hủy (`Cancelled`) | `st-6` | `st-cancelled-bg` / `st-cancelled` | #F8DADA / #8A1F16 | 7,01:1 |

**Màu thanh toán:** Chưa thanh toán = nền `st-pending-bg`, chữ `st-pending` (`pay-0`); Đã thanh toán = nền `success-50`, chữ `success` (`pay-1`).

**Sắc nền theo loài** (nền ô hình thú cưng) – chưa có token trong mã, thêm vào `@theme` **(Đề xuất)**:

| Token | Giá trị | Loài |
| --- | --- | --- |
| `sp-dog` | #FFE6B8 | Chó |
| `sp-cat` | #D4EEF0 | Mèo |
| `sp-rabbit` | #E6E4FA | Thỏ |
| `sp-guinea` | #DDF1DD | Chuột lang |

**Màu loại lịch:** Spa dùng `lagoon` (biểu tượng giọt nước); Lưu trú dùng tím #6A5BC4 (biểu tượng giường), cuống phiếu hẹn lưu trú nền #F1EFFC, chữ #4A3FA6 – thêm token `hotel` (#6A5BC4), `hotel-50` (#F1EFFC), `hotel-700` (#4A3FA6) **(Đề xuất)**.

**Màu trên nền tối (thanh trên SW, thanh bên MW)** – lấy nguyên UI demo: chữ menu #CFE7E9 (SW) / #D3E7E9 (MW), chữ phụ logo #9FD0D4 (SW) / #89BDC2 (MW), hover nền trắng 8 – 10%, mục đang chọn nền trắng chữ Lagoon đậm, vòng focus Apricot (`onDarkFocusClass` trong `staff-web/components/layout/header-styles.ts`).

### 2.2 Chữ

| Hạng mục | Quy định |
| --- | --- |
| Phông | **Be Vietnam Pro** 400/500/600/700, tải bằng `next/font/google` (biến `--font-be-vietnam-pro`, subset `latin` + `vietnamese`, `display: swap`); dự phòng `system-ui, -apple-system, "Segoe UI", sans-serif`. |
| H1 | 24/32, 700, `letter-spacing: -0.01em` – tiêu đề trang. Màn đăng nhập 26/34. |
| H2 | 17/24, 600 – tiêu đề thẻ, khối. Hộp thoại 18/26. |
| H3 | 14/20, 600 – tiêu đề nhỏ. |
| Nội dung | 14/22, 400 (đặt ở `body`; không cần thêm lớp cỡ chữ). |
| Chú thích | 12/16 (`text-xs`) – gợi ý dưới ô nhập, dòng phụ, thời gian. |
| Nhãn ô nhập | 13/18, 600. |
| Số lớn | Số tiền tổng 22/28 – 28/34, 700; số liệu thẻ KPI 28/34, 700; giờ trên cuống phiếu hẹn 20/24, 700. |
| Độ đậm | 400 nội dung · 500 menu · 600 nhãn, tiêu đề nhỏ · 700 tiêu đề trang và số tiền tổng (SA 6.1). |
| Số | Chữ số đều (`tabular-nums`) cho tiền, giờ, ngày, cột số trong bảng. |

H1, H2, H3 đã có kiểu gốc trong `@layer base` của `globals.css`; dùng thẻ `h1`/`h2`/`h3` đúng cấp thay vì tự đặt cỡ chữ.

### 2.3 Khoảng cách, bo góc, bóng, lớp

| Hạng mục | Quy định | Lớp Tailwind |
| --- | --- | --- |
| Lưới khoảng cách | Bội số 4px (SA 6.1). Khoảng cách thường dùng: 4, 6, 8, 10, 12, 16, 20, 24, 32. | `gap-1` … `gap-8`, `p-5` (20px)… |
| Bo góc | Thẻ lớn 16px · thẻ chọn, phiếu hẹn, alert 12px · nút, ô nhập 10px · chip nhỏ, mục menu thả 8px · badge, chip lọc: tròn hẳn. | `rounded-2xl` · `rounded-xl` · `rounded-[10px]` · `rounded-lg` · `rounded-full` |
| Viền | 1px `line`; trong thẻ `line-soft`; viền nét đứt cho thẻ “Thêm…”, mốc đã kín, ô tải ảnh. | `border border-line` |
| Bóng | Chỉ cho lớp nổi: menu thả, hộp thoại, ngăn kéo, toast – `--shadow-pop`. Thẻ thường không có bóng. | `shadow-pop` |
| Lớp (z-index) | Thanh trên/thanh bên 40 · menu thả 70 · nền mờ hộp thoại 150 · toast 200. | `z-40`, `z-[70]`, `z-[150]`, `z-[200]` |
| Chuyển động | Hover, focus 150 – 200ms; chuyển màn mờ dần ≤ 150ms; hộp thoại phóng nhẹ 160ms; ngăn kéo trượt 200ms; toast trượt lên 200ms; tắt hết khi người dùng bật “giảm chuyển động” (đã có trong `globals.css`). | `transition`, `animate-toast-in` |
| Vòng focus | `outline: 3px solid rgba(11,110,120,.4)`, cách 2px (đã có trong `globals.css`); trên nền tối dùng Apricot. Ô nhập khi focus: viền `lagoon` + vòng sáng 3px `rgba(11,110,120,.18)`. | – |

---

## 3. Khung bố cục

| Web | Khung | Kích thước |
| --- | --- | --- |
| Khách hàng | Thanh trên nền trắng, viền dưới `line`, dính đầu trang | Cao 68px; nội dung tối đa 1200px, đệm 28/32/72px (trên/ngang/dưới); dưới 980px đệm 20/16/56px |
| Nhân viên | Thanh trên nền `lagoon-700`, dính đầu trang | Cao 64px; nội dung tối đa 1320px, đệm 24/24/72px; nút cao tối thiểu 44px (nút nhỏ 36px) |
| Quản lý | Thanh bên trái cố định nền `lagoon-800` | Rộng 248px; nội dung lệch trái 248px, tối đa 1280px, đệm 28/32/72px; dưới 980px thanh bên thành thanh ngang cuộn được |
| Đăng nhập / đăng ký (3 web) | Không khung; lưới 2 cột: khối giới thiệu (nền Lagoon / Lagoon 700 / Lagoon 800 theo web) + form trắng tối đa 400px | Dưới 980px ẩn khối giới thiệu |

**Bố cục trong trang** (lớp UI demo → cách làm bằng Tailwind):

| Mẫu | UI demo | Quy định |
| --- | --- | --- |
| Đầu trang | `.page-head` | Tiêu đề + mô tả (`text-muted`, cách 4px) bên trái, nút/bộ lọc bên phải căn đáy; cách nội dung 24px; xuống dòng khi hẹp. Có đường dẫn (`.crumb`, 13px `muted`) phía trên khi là màn con. |
| Nội dung + cột tóm tắt | `.split` (cột phải 360px), `.split-wide` (400px) | Cột phải dính khi cuộn (`summary`); dưới 1180px thành 1 cột. |
| Danh sách + chi tiết | `.split-list` (cột trái 420px; MW-04 380px) | Dưới 1180px thành 1 cột. |
| Lưới thẻ | `.g2`, `.g3`, `.g4` | `grid-cols-2/3/4 gap-4`; `.g4` → 2 cột dưới 980px; `.g3` → 1 cột dưới 980px; `.g2` → 1 cột dưới 640px. |
| Form 2 cột | `.form-grid` | `grid-cols-2 gap-x-5 gap-y-4`; ô rộng `col-span-2`; 1 cột dưới 640px. |

---

## 4. Thành phần dùng chung

Cột “Mã nguồn” ghi thành phần đã có trên `develop` (CW: `customer-web`, SW: `staff-web`, MW: `manager-web`); “–” là chưa có, cần làm khi thẻ đầu tiên dùng tới. Vị trí thư mục theo Frontend-Architecture mục 3: `components/ui` (thuần giao diện), `components/domain` (gắn nghiệp vụ), `components/feedback`, `components/layout`.

### 4.1 Thành phần cơ bản (`components/ui`)

| Thành phần | UI demo | Biến thể / props chính | Quy tắc | Mã nguồn |
| --- | --- | --- | --- | --- |
| `Button` | `.btn` | `variant`: `primary` (nền Lagoon), `secondary` (viền Lagoon, nền trắng), `danger` (viền Danger), `danger-solid` (nền Danger – nút xác nhận trong hộp thoại nguy hiểm), `ghost`, `quiet` (nền Mist); `size`: `sm` (34px) / `md` (40px) / `lg` (48px); `block`; `loading` (spinner + “Đang gửi…”, tự vô hiệu hóa); `disabledReason` (hiện lý do dưới nút); `icon`. Dạng liên kết: `ButtonLink` (bọc `next/link`). | Tối đa một `primary` mỗi màn; web nhân viên cao tối thiểu 44px; nút chỉ có biểu tượng phải có `aria-label`. | – |
| `IconButton` | `.icon-btn` | 40px (44px ở SW), `active`, `badge` (chấm đỏ số). | – | Viết thẳng trong `header-nav.tsx` (CW, SW) |
| `LinkButton` | `.link-btn` | Chữ Lagoon đậm 600, kèm biểu tượng. | Dùng cho thao tác phụ trong thẻ (“Thêm thú cưng”, “Xem tất cả”). | – |
| `Badge` | `.badge` | `tone`: `st-1` … `st-6`, `pay-0`, `pay-1`, `neutral`; `size`: `md` (24px) / `lg` (28px). Có chấm tròn trước chữ. | Không dùng cho nhãn không phải trạng thái. | – |
| `Tag` | `.tag` | `tone`: `default`, `suggest` (Apricot), `size` (viền trắng), `walkin`, `account`, `lock`, `warn`, `ok`, `info`; `icon`. | Nhãn mô tả (nhóm kích cỡ, tính cách, “Hệ thống đề xuất”, “Chỉ xem”). | – |
| `Card` | `.card`, `.card-head/body/foot` | `Card`, `CardHeader` (tiêu đề H2 + phần phải), `CardBody` (đệm 20px), `CardFooter` (nút; nút chính đẩy phải bằng `ml-auto`). | Thẻ không có bóng. | – |
| `Panel`, `SoftBox` | `.panel`, `.surface-soft` | Nền `lagoon-25` / `mist`, bo 12px. | Ô thông tin phụ trong thẻ. | – |
| `Field` | `.field`, `.label`, `.hint` | `label`, `required` (dấu * đỏ), `optional` (“(không bắt buộc)”), `hint`, `error` → `FieldError`; tự gắn `htmlFor`, `aria-describedby`, `aria-invalid`. | Nhãn luôn ở trên ô (SA 6.1). | `FieldError` (CW, SW) |
| `Input`, `Select`, `Textarea` | `.input`, `.select`, `.textarea` | Cao 42px (38px trong bảng, lọc); `prefixIcon` (`.input-wrap`); `suffix` (“kg”, “cm”, “đ”, “phút” – `.input-suffix`); trạng thái lỗi viền Danger; `readOnly` nền Mist; `disabled` nền xám. Tương thích `register` của React Hook Form (`forwardRef`). | Ô số dùng `inputMode="decimal"`/`"numeric"`, cho phép dấu phẩy thập phân. | – |
| `ChoiceCard` | `.choice`, `.radio-dot`, `.check-box` | `type`: `radio` / `checkbox`; `selected`, `disabled`; nội dung tùy ý (hình, tiêu đề, mô tả). | Chọn loài, thú cưng, tính cách, vai trò, chuồng, cổng thanh toán. Dùng `input` thật ẩn bên trong để bàn phím chọn được. | – |
| `SegmentedControl` | `.seg` | Danh sách lựa chọn, một lựa chọn đang bật (nền trắng, chữ Lagoon đậm). | Chọn loài (CW-03, SW-14), phương thức thanh toán, nhóm Tất cả/Spa/Lưu trú. | – |
| `FilterChip` | `.chip` | `active` (nền Ink), `count`. | Lọc nhanh danh sách. | – |
| `Tabs` | `.tabs` | Gạch chân Lagoon khi chọn; `count`. Cuộn ngang khi hẹp. | Đồng bộ với `?tab=` trên URL. | – |
| `Switch` | `.switch` | 38×22px. | Chưa có màn dùng; giữ cho bật/tắt sau này. | – |
| `Table` | `.table`, `.table-wrap`, `.filters`, `.table-foot` | Tiêu đề cột dính, nền Mist, chữ 12px `muted`; dòng hover nền #F8FBFB; dòng chọn nền `lagoon-50` + vạch trái Lagoon; cột số `tabular-nums`; cột thao tác căn phải; vùng lọc phía trên; chân bảng “Hiển thị a – b trong n …” + `Pager`. | Bảng rộng cuộn ngang trong thẻ, không làm trang cuộn ngang. | – |
| `Pager` | `.pager` | Nút 32px; trang hiện tại nền Lagoon; nút trước/sau có `aria-label`. | Theo `page`, `pageSize`, `total` của API. | – |
| `Modal`, `ConfirmDialog` | `.overlay`, `.modal` | `Modal`: rộng 480px (`wide` 640px), đầu (biểu tượng màu theo loại `danger`/`teal`/`warn` + tiêu đề + mô tả), thân, chân (nút phải). `ConfirmDialog`: `title`, `description`, `consequences[]`, `confirmLabel`, `tone="danger"` → nút `danger-solid` + nút quay lại `ghost`. | Dùng phần tử `dialog` hoặc `role="dialog"` + `aria-modal`; khóa cuộn nền; Esc và bấm nền mờ để đóng (trừ khi đang gửi); focus nút đầu chân hộp thoại khi mở, trả focus về nút mở khi đóng. Hành động nguy hiểm bắt buộc qua `ConfirmDialog` (SA 6.6). | – |
| `Drawer` | `.drawer` | Ngăn kéo phải, rộng 640px (520px cho form ngắn), đầu (tiêu đề + nút đóng), thân cuộn, chân nút. | Form dài: thêm/sửa dịch vụ, nhân viên. | – |
| `Dropdown` | `.dd`, `.dd-menu` | `label`, `align` (trái/phải); đóng khi bấm ngoài, Esc, chọn mục; `dropdownItemClass`. | Menu thanh trên, menu ⋯ của thẻ. | `Dropdown` (CW, SW) |
| `Avatar` | `.avatar` | 32px (lg 56px), chữ cái đầu; `tone`: apricot (mặc định), teal, violet, blue. | – | Viết thẳng trong header |
| `Skeleton`, `Spinner` | `.skeleton`, `.spinner` | Khối xám nhạt có hiệu ứng lướt; spinner 16px. | Tải lần đầu dùng skeleton (SA 6.6). | – |
| `EmptyState` | `.empty` | Hình (ô 88px nền `lagoon-50` + biểu tượng), tiêu đề H3, mô tả `muted`, nút gợi ý (`secondary`). | Luôn có hành động gợi ý nếu người dùng làm được gì đó (SA 6.6). | – |
| `KpiTile` | `.kpi` | Biểu tượng + nhãn, số 28px, dòng phụ; `accent` (nền Apricot nhạt); bấm được → liên kết. | MW-02, MW-07, MW-10. | – |
| `Divider`, `KeyValue`, `DescriptionList` | `.divider`, `.kv`, `.dl` | Dòng “nhãn – giá trị” căn hai bên; lưới 150px + giá trị. | Khối thông tin. | – |

### 4.2 Phản hồi (`components/feedback`)

| Thành phần | UI demo | Quy tắc | Mã nguồn |
| --- | --- | --- | --- |
| `Alert` | `.alert-*` | `tone`: `warn` (nền #FFF6E3, viền #F1D9A2, biểu tượng #B87400), `info`, `success`, `danger`, `neutral`; `title` (600) + nội dung; biểu tượng đầu dòng. Cảnh báo nghiệp vụ nội tuyến (SA 6.1). | – (mới có `ErrorAlert`) |
| `ErrorAlert` | `.alert-danger` / `.alert-warn` + đồng hồ | Nhận lỗi bất kỳ, tự lấy câu qua `getErrorMessage`; 429 dùng kiểu cảnh báo có đồng hồ. Đặt ngay tại chỗ thao tác. | CW, SW (MW: bản rút gọn, chưa có kiểu 429) |
| `FieldError` | `.error-text` | Dưới ô nhập, 12px Danger, biểu tượng cảnh báo; `id` để gắn `aria-describedby`. | CW, SW |
| `ForbiddenState` | `.alert-neutral` + khiên | “Bạn không có quyền xem trang này” / “Lỗi 403…”. | CW, SW |
| `Toast` | `.toast` | Góc phải dưới (dưới 640px rộng hết màn), nền Ink, biểu tượng xanh/đỏ; thành công tự ẩn 3,4 giây, lỗi giữ đến khi đóng; `role="status"`/`"alert"`, vùng `aria-live="polite"`. | `ToastProvider`, `useToast` (CW, SW) |
| `Countdown` | `.countdown` | Viên nền Ink, đồng hồ + `mm:ss`, chữ số đều; tính từ `expiresAt` của backend; về 0 thì gọi `onExpire` (tải lại dữ liệu, không tự hủy ở web – SA 6.6). | – |

### 4.3 Thành phần nghiệp vụ (`components/domain`)

| Thành phần | UI demo | Mô tả | Dùng ở |
| --- | --- | --- | --- |
| `StatusBadge` | `.badge.st-*` | Nhận `AppointmentStatus` → nhãn + màu (UI-Screens 2.4). | Mọi danh sách, chi tiết lịch hẹn |
| `PaymentBadge` | `.badge.pay-*` | Nhận `PaymentStatus`. | CW-09, SW-09, SW-10, MW-03, MW-10 |
| `AppointmentTypeLabel` | `.type-spa`, `.type-hotel` | Biểu tượng + “Spa” / “Lưu trú”. | Bảng, phiếu hẹn |
| `PetAvatar` | `.pet` + `#g-dog`… | Hình minh họa theo `species` trên nền sắc loài; cỡ `sm` 34 · `md` 44 · `lg` 72 · `xl` 96px. | Mọi nơi có thú cưng |
| `PetLine` | `.pet-line` | `PetAvatar` + tên (600) + dòng phụ. | Bảng, tóm tắt |
| `AppointmentTicket` | `.ticket` | “Phiếu hẹn” – yếu tố nhận diện chung: cuống trái (giờ lớn + ngày; lưu trú nền tím nhạt; đã hủy gạch ngang) ngăn bằng đường nét đứt và 2 khuyết tròn, thân (hình, tiêu đề, mô tả, thẻ cảnh báo), cột phải (badge, mã). `compact`; `selected`; là liên kết khi có `href`. Dưới 640px cột phải xuống dưới. | CW-08, SW-02 (NVS), SW-04, SW-07, SW-09, MW-04 |
| `Lifecycle` | `.lifecycle`, `.lc` | Thanh các bước theo loại lịch; `done` (chấm Lagoon + dấu kiểm), `current` (vòng sáng), `todo` (chữ `muted`), `cancel` (chấm đỏ). Dưới 640px xếp dọc. | CW-09, SW-03, MW-05 |
| `Stepper` | `.stepper` | Bước đánh số, bước xong nền xanh dấu kiểm, bước hiện tại nền Lagoon. | CW-06 |
| `Timeline` | `.timeline`, `.tl` | Dòng thời gian dọc; chấm `ok` / `warn` / `bad`. | MW-05 |
| `DateStrip` | `.date-strip`, `.date-chip` | Dải ngày 78px (thứ + dd/MM), ngày chọn nền Lagoon, cuộn ngang. | CW-06, CW-10, SW-06 |
| `SlotPicker` | `.slot-group`, `.slot`, `.slot-legend` | Nhóm Sáng/Trưa/Chiều, tối (cột tên 110px + lưới 5 cột, 3 cột dưới 640px); mốc: `available` (“còn chỗ”), `selected` (“kết thúc HH:mm”), `full` (nét đứt, gạch ngang, “Đã kín”, không focus được), `not-accepted` (nền vàng, ghi chú); chú giải. Nhận `slots[]` của `GET /spa/slots`. | CW-06, CW-10, SW-06, MW-05·D1 |
| `ServiceOption` | `.svc` | Thẻ chọn dịch vụ: ô kiểm, tên, thời lượng, “Nhận đến HH:mm”, giá. | CW-06, CW-10, SW-06 |
| `ServiceTask` | `.svc-task` | Dòng dịch vụ có vòng tick, trạng thái xong (nền xanh nhạt), ghi chú, giá hoặc nút. | CW-09, SW-03, SW-07 (các bước lưu trú), SW-11, MW-05 |
| `StaffOption` | `.staff-opt` | Ô chọn nhân viên: radio/ô kiểm, avatar, tên + thẻ “Hệ thống đề xuất”/“Ngoài ca làm”, dòng thông tin, số lịch 30 ngày; `disabled`, `warn`. | MW-04, MW-05·D1 |
| `CostBanner` | `.cost-banner`, `.cost-figures` | Banner xác nhận chi phí mới: ô biểu tượng Apricot, tiêu đề + `Countdown`, mô tả, số tiền cũ gạch ngang → mới, 2 nút. | CW-09 |
| `PhotoTile`, `PhotoUpload` | `.photo`, `.upload-box`, `.progress` | Ảnh 4:3 nhãn Trước (trắng)/Sau (Lagoon) + dải thời gian; ô kéo-thả/chụp ảnh viền nét đứt (biểu tượng máy ảnh, “Chỉ nhận tệp ảnh”), thanh tiến trình khi tải. | CW-09, CW-11, SW-11, MW-05 |
| `CageCard` | `.cage`, `.st-pill` | Thẻ chuồng: mã lớn, nhãn Trống/Đang chứa/Ngừng sử dụng, loài + nhóm, thú cưng + chủ, giờ trả; trống: nền kẻ sọc nhạt; trả hôm nay: viền Apricot. | SW-08 |
| `ServiceCatalogTable` | `.catalog-row` | Bảng dịch vụ × 3 nhóm kích cỡ (giá, thời lượng, số nhân viên tùy chọn), “Không áp dụng”. Dưới 640px 2 cột, ẩn hàng tiêu đề. | CW-03, SW-14 |
| `PriceGrid` | `.price-grid` | Bảng nhập giá theo loài × nhóm. | MW-06·D1, MW-07, MW-13 |
| `SummaryCard`, `SumLine`, `SumTotal` | `.summary`, `.sum-line`, `.sum-total` | Thẻ tóm tắt dính bên phải: dòng mục + số tiền; tổng 22px đậm + chú thích dưới. | CW-06, CW-07, CW-10, SW-06 |
| `ShiftTable`, `ShiftCell` | `.shift-table`, `.shift` | Bảng ca theo tuần; ô ca nền `lagoon-50`, ô chọn viền Lagoon; “—” khi không có ca. | MW-12 |
| `StaffGantt` | `.gantt` | Biểu đồ thời gian theo nhân viên: ca (nền sọc), khối lịch theo màu trạng thái, dọn dẹp (vạch), vạch giờ hiện tại. | MW-02 |
| `NotificationItem` | `.notif` | Ô biểu tượng theo `type`, tiêu đề (chấm Lagoon khi chưa đọc), nội dung, thời gian, liên kết. | CW-12, SW-13 |
| `GatewayOption` | `.gw` | Thẻ chọn cổng thanh toán (logo chữ VNPAY nền #005BAA, MoMo nền #A50064). | CW-09·D3 |

### 4.4 Khung (`components/layout`)

| Thành phần | Web | Mã nguồn |
| --- | --- | --- |
| `SiteHeader` + `HeaderNav` (+ `BrandMark`) | CW, SW | Đã có (`site-header.tsx`, `header-nav.tsx`); SW khai báo menu theo vai trò bằng `NAV_ITEMS`. |
| `Sidebar` | MW | Đã có (`sidebar.tsx`), cần sửa danh sách mục theo UI demo (User-Flows 2.3), thêm số chờ xử lý, khối tài khoản + đăng xuất. |
| `AuthLayout` (khối giới thiệu + form) | CW, SW, MW | – |
| `PageHeader` (đường dẫn + tiêu đề + mô tả + thao tác) | CW, SW, MW | – |

---

## 5. Biểu tượng

- Bộ biểu tượng nét mảnh 24×24, nét 1,75, đầu tròn, chép từ sprite của UI demo vào `components/icons.tsx` (`<Icon name="…" />`, mặc định 18px; `className` đổi cỡ 14 – 28px). Biểu tượng chỉ trang trí có `aria-hidden`; nút chỉ có biểu tượng phải có `aria-label`.
- Tên có trong UI demo (dùng đúng tên khi chép thêm): `alert`, `arrow-l`, `arrow-r`, `ban`, `bed`, `bell`, `calendar`, `calendar-plus`, `camera`, `card`, `cash`, `check`, `check-circle`, `chev-d`, `chev-l`, `chev-r`, `clipboard`, `clock`, `dashboard`, `dots`, `droplet`, `edit`, `eye`, `filter`, `grid`, `handover`, `heart`, `history`, `home`, `hourglass`, `image`, `info`, `key`, `list`, `lock`, `login`, `logout`, `mail`, `moon`, `note`, `paw`, `phone`, `pin`, `play`, `plus`, `qr`, `receipt`, `refresh`, `ruler`, `scale`, `scissors`, `search`, `shield`, `sliders`, `store`, `swap`, `timer`, `trash`, `unlock`, `upload`, `user`, `user-plus`, `users`, `wallet`, `x`, `x-circle`.
- Hình minh họa thú cưng (`g-dog`, `g-cat`, `g-rabbit`, `g-guinea`) và logo dấu chân (`logo-paw` → `PawLogo`) chép nguyên từ UI demo; chỉ dùng trong `PetAvatar` và logo.
- Hiện mỗi web chỉ chép các biểu tượng đang dùng; thêm biểu tượng mới thì chép từ UI demo, không vẽ lại, không lấy từ bộ khác.

---

## 6. Co giãn (responsive)

Thiết kế cho máy tính trước rồi thu hẹp, đúng như CSS của UI demo (dùng `max-width`). Trong Tailwind dùng biến thể tùy ý `max-[…px]:` như mã hiện có của `customer-web`, `staff-web`.

| Mốc | Biến thể | Thay đổi chính |
| --- | --- | --- |
| ≤ 1180px | `max-[1180px]:` | Bố cục 2 cột (`split`, `split-wide`, `split-list`) thành 1 cột; cột tóm tắt hết dính. |
| ≤ 980px | `max-[980px]:` | Đệm nội dung 16px; thanh bên MW thành thanh ngang; ẩn khối giới thiệu ở màn đăng nhập; `g4` → 2 cột, `g3` → 1 cột; SW ẩn chữ phụ logo. |
| ≤ 860px | `max-[860px]:` | Thanh trên CW: menu và tên tài khoản chỉ còn biểu tượng (nhãn vẫn có cho trình đọc màn hình). |
| ≤ 640px | `max-[640px]:` | Form, `g2` thành 1 cột; phiếu hẹn: cột phải xuống dưới; lưới mốc giờ 3 cột; thanh bước chỉ hiện nhãn bước hiện tại; vòng đời xếp dọc; menu SW chỉ còn biểu tượng; nút cho phép xuống dòng; toast rộng hết màn. |

- **Kiểm tra bắt buộc** (DoD mục B): không cuộn ngang ở bề rộng **1024px** và **375px**. Bảng rộng cuộn ngang bên trong thẻ (`overflow-x-auto`), menu cuộn ngang bên trong thanh (`staff-web` đã xử lý nhãn `sr-only` gây tràn).
- Web khách hàng và web nhân viên phải dùng được trên điện thoại, máy tính bảng; web quản lý ưu tiên máy tính, chỉ cần không vỡ bố cục trên màn hẹp (SA 2.4).
- `manager-web` hiện dùng biến thể riêng `narrow:` (`@custom-variant`, ≤ 980px) – đổi sang `max-[980px]:` cho thống nhất **(Đề xuất)**.

---

## 7. Trợ năng (accessibility)

| Quy tắc | Cách làm |
| --- | --- |
| Tương phản chữ đạt WCAG AA | Chỉ dùng cặp màu ở mục 2.1; không đặt chữ Apricot trên nền trắng. |
| Không chỉ dựa vào màu | Badge, mốc giờ, chuồng luôn có chữ (“Đã kín”, “Trống”…). |
| Bàn phím | Mọi thao tác dùng được bằng Tab/Enter/Space/Esc; thứ tự focus theo thứ tự đọc; mốc giờ đã kín không nhận focus; thẻ chọn dùng `input` thật bên trong. |
| Focus nhìn thấy | Giữ vòng focus của `globals.css`; nền tối dùng `onDarkFocusClass`. Không đặt `outline: none` khi không có thay thế. |
| Ngữ nghĩa | Một `h1` mỗi trang; `nav` có `aria-label` (“Menu chính”, “Menu nhân viên”, “Menu quản lý”); mục menu đang chọn có `aria-current="page"`; bảng dữ liệu dùng `table`/`th`; nhóm lựa chọn dùng `fieldset` + `legend` (có thể ẩn). |
| Form | Mỗi ô có `label`; lỗi gắn bằng `aria-describedby` + `aria-invalid`; sau khi gửi lỗi, focus ô lỗi đầu tiên (React Hook Form `shouldFocusError`). |
| Thông báo động | Toast trong vùng `aria-live="polite"`; lỗi dùng `role="alert"`; đồng hồ đếm ngược không đọc mỗi giây (`aria-live="off"`, có nhãn tổng). |
| Vùng chạm | Web nhân viên tối thiểu 44px (SA 6.1); web khách hàng nút chính ≥ 40px. |
| Giảm chuyển động | Tôn trọng `prefers-reduced-motion` (đã có trong `globals.css`). |
| Ngôn ngữ | `<html lang="vi">` (đã có). |

---

## 8. Câu chữ giao diện

- Tiếng Việt có dấu, câu ngắn, xưng “bạn” với khách hàng, gọi thú cưng là “bé” ở web khách hàng; web nội bộ dùng câu trung tính (“Khách”, “Lịch”).
- Nút là động từ + đối tượng: “Gửi yêu cầu đặt lịch”, “Xác nhận tiếp nhận”, “Thu phí trả muộn”. Nút trong hộp thoại nguy hiểm nêu đúng hậu quả (“Từ chối và hủy lịch”), nút còn lại là “Quay lại” / “Giữ …”.
- Lỗi nêu cách sửa (SA 6.6), không lộ chi tiết kỹ thuật, không nêu trường nào sai khi đăng nhập.
- Câu chữ lấy nguyên UI demo; câu mới ghi ở UI-Screens kèm nhãn **(Đề xuất)** để nhóm duyệt. Danh sách câu thông báo lỗi chuẩn: Frontend-Conventions mục 5.

---

## 9. Hiện trạng trong mã và việc cần đồng bộ

| Hạng mục | CW | SW | MW | Việc cần làm |
| --- | --- | --- | --- | --- |
| Token màu, trạng thái (`globals.css`) | Đủ | Đủ (giống CW) | Thiếu phần lớn (chỉ `lagoon-800`, `apricot`, `ink`, `mist`, `danger`, `danger-50`) | Chép khối `@theme` của CW sang MW; thêm `sp-*`, `hotel*` cho cả 3 web. |
| Kiểu gốc chữ (`h1`–`h3`, `body`, focus, giảm chuyển động) | Đủ | Đủ | Thiếu `h2`, `h3`, giảm chuyển động | Đồng bộ theo CW. |
| `Icon` | 17 biểu tượng | 23 biểu tượng | 9 biểu tượng (có `dashboard`, `scissors`, `lock` mà CW, SW chưa có); `Icon` chỉ nhận `name`, `className`, không nhận thuộc tính SVG khác | Gộp về một danh sách tên thống nhất, cùng chữ ký `Icon` của CW (nhận mọi thuộc tính SVG). |
| Phản hồi (`ErrorAlert`, `FieldError`, `ForbiddenState`, `Toast`) | Đủ | Đủ | Chỉ `ErrorAlert` rút gọn | Chép bộ của CW sang MW, thêm `ToastProvider` vào `providers.tsx` của MW. |
| Mốc co giãn | `max-[…]:` | `max-[…]:` | `narrow:` | Thống nhất `max-[…]:`. |
| Thành phần `ui`, `domain` | Chưa có | Chưa có | Chưa có | Làm dần theo thẻ, đặt đúng thư mục ở Frontend-Architecture mục 3; cùng mã cho 3 web. |
