// Định dạng hiển thị (Frontend-Conventions 7). Giá trị gửi API giữ nguyên dạng gốc.

/** “0903412678” → “0903 412 678”; chuỗi khác giữ nguyên. Chỉ để hiển thị, gửi API dạng liền. */
export function formatPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

/** 270000 → “270.000đ”: số nguyên VND, dấu chấm hàng nghìn, “đ” liền sau số. */
export function formatMoney(amount: number) {
  return `${MONEY_FORMAT.format(amount)}đ`;
}

// Tên người Việt: tên gọi nằm cuối, nên tên ngắn và chữ cái đầu lấy từ hai chữ cuối (“Trần Minh Anh” → “Minh Anh”, “MA”).
function lastWords(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).slice(-2);
}

/** Tên ngắn trên thanh trên: “Trần Minh Anh” → “Minh Anh”. */
export function getShortName(fullName: string) {
  return lastWords(fullName).join(" ");
}

/** Chữ cái đầu trong avatar: “Trần Minh Anh” → “MA”. */
export function getInitials(fullName: string) {
  return lastWords(fullName)
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
const WEEKDAYS = ["chủ nhật", "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy"];
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

/** “2026-10-06” → “thứ ba 06/10”. */
export function formatWeekdayDayMonth(date: string) {
  return `${WEEKDAYS[weekdayIndex(date)]} ${formatDayMonth(date)}`;
}

/** “2026-10-06” → “Thứ ba 06/10/2026”. */
export function formatFullDate(date: string) {
  const weekday = WEEKDAYS[weekdayIndex(date)];
  return `${weekday.charAt(0).toLocaleUpperCase("vi-VN")}${weekday.slice(1)} ${formatDayMonth(date)}/${date.slice(0, 4)}`;
}

/** 120 → “2 giờ”; 75 → “75 phút”. */
export function formatDuration(minutes: number) {
  return minutes % 60 === 0 ? `${minutes / 60} giờ` : `${minutes} phút`;
}

/** Mã lịch hẹn ngắn “LH-” + 8 ký tự đầu của uuid, viết hoa (UI-Screens G-01). */
export function formatAppointmentCode(appointmentId: string) {
  return `LH-${appointmentId.slice(0, 8).toUpperCase()}`;
}
