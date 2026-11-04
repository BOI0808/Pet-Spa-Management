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
