// Đọc số người dùng nhập vào ô. Hiển thị số thì dùng `lib/format.ts`.

/** Số tiền tối đa backend chấp nhận (khớp `HotelPricingRowRequestValidator.MaxAmount` và `PricingRowRequestValidator.MaxPrice`). */
export const MAX_MONEY_AMOUNT = 999_999_999_999;

// Số nguyên không âm, có thể ngăn hàng nghìn bằng dấu chấm, phẩy hoặc khoảng trắng (“180.000”). “1.5” không hợp lệ.
const WHOLE_NUMBER_PATTERN = /^(\d+|\d{1,3}([.,\s]\d{3})+)$/;

/** Chuỗi nhập → số nguyên không âm; không hợp lệ → NaN. */
export function toWholeNumber(text: string) {
  const value = text.trim();
  return WHOLE_NUMBER_PATTERN.test(value) ? Number(value.replace(/[.,\s]/g, "")) : Number.NaN;
}
