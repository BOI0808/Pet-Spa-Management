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
