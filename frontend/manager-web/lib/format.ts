// Định dạng hiển thị (Frontend-Conventions 7). Giá trị gửi API giữ nguyên dạng gốc.

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

/** 270000 → “270.000đ”: số nguyên VND, dấu chấm hàng nghìn, “đ” liền sau số. */
export function formatMoney(amount: number) {
  return `${MONEY_FORMAT.format(amount)}đ`;
}
