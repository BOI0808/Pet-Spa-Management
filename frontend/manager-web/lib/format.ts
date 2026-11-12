// Định dạng hiển thị (Frontend-Conventions 7). Giá trị gửi API giữ nguyên dạng gốc.

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

/** 270000 → “270.000”: số nguyên VND có dấu chấm hàng nghìn, không kèm “đ” (dùng cho ô nhập đã có hậu tố “đ”). */
export function formatAmount(amount: number) {
  return MONEY_FORMAT.format(amount);
}

/** 270000 → “270.000đ”: số nguyên VND, dấu chấm hàng nghìn, “đ” liền sau số. */
export function formatMoney(amount: number) {
  return `${formatAmount(amount)}đ`;
}

/** “0903412678” → “0903 412 678”; chuỗi khác giữ nguyên. Chỉ để hiển thị, gửi API dạng liền. */
export function formatPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

/** Chữ cái đầu trong avatar: tên người Việt có tên gọi nằm cuối nên lấy từ hai chữ cuối (“Trần Minh Anh” → “MA”). */
export function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toLocaleUpperCase("vi-VN"))
    .join("");
}

// Số thập phân kiểu Việt Nam (dấu phẩy), không nhóm hàng nghìn vì cân nặng, chiều cao đều nhỏ.
const decimalFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2, useGrouping: false });
const weightFormat = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** 1.5 → “1,5”; 30 → “30”. */
export function formatDecimal(value: number) {
  return decimalFormat.format(value);
}

/** 9 → “9,0 kg”; giữ chữ số thập phân thứ hai nếu có (4.25 → “4,25 kg”) để không làm tròn số khách đã khai. */
export function formatWeight(kg: number) {
  return `${weightFormat.format(kg)} kg`;
}

// Ngày dạng “YYYY-MM-DD” đã theo múi giờ cửa hàng (lib/time.ts), chỉ cần đọc thứ và tách ngày, tháng.
const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function weekdayIndex(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** “2026-10-06” → “T3”. */
export function formatWeekdayShort(date: string) {
  return WEEKDAYS_SHORT[weekdayIndex(date)];
}

/** “2026-10-06” → “06/10”. */
export function formatDayMonth(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

/** Mã lịch hẹn ngắn “LH-” + 8 ký tự đầu của uuid, viết hoa (UI-Screens G-01). */
export function formatAppointmentCode(appointmentId: string) {
  return `LH-${appointmentId.slice(0, 8).toUpperCase()}`;
}
