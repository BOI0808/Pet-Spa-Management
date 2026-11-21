import type { CounterMethod, CounterPaymentRequest } from "@/lib/api/types";
import { MAX_MONEY_AMOUNT, toWholeNumber } from "@/lib/number-input";

// MW-10·D1 Ghi nhận thanh toán tại quầy – UI-Screens.md (FR-PAY-02; BR-07, BR-17)

/** Mã lỗi 409 khi số tiền thực nhận thấp hơn số phải trả. */
export const AMOUNT_MISMATCH_CODE = "AMOUNT_MISMATCH";

/** Câu của SA 6.6 cho “SW-09 / MW-10 Thanh toán quầy”. */
export const AMOUNT_SHORT_MESSAGE = "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.";

export type CounterPaymentFormValues = {
  /** Số tiền thực nhận, giữ dạng chuỗi như người dùng nhập (“250.000”). */
  receivedAmount: string;
};

/**
 * Số tiền thực nhận: số nguyên không âm, không vượt mức backend nhận, không thấp hơn số phải trả (BR-17).
 * Kiểm ở web chỉ để báo sớm; backend vẫn kiểm lại và quyết định.
 */
export function validateReceivedAmount(value: string, amountDue: number) {
  if (value.trim() === "") return "Nhập số tiền thực nhận.";
  const amount = toWholeNumber(value);
  if (Number.isNaN(amount)) return "Số tiền thực nhận phải là số nguyên không âm.";
  if (amount > MAX_MONEY_AMOUNT) return "Số tiền tối đa 999.999.999.999đ.";
  if (amount < amountDue) return AMOUNT_SHORT_MESSAGE;
  return true;
}

/** Form → body POST /payments/{id}/counter; gọi sau khi `validateReceivedAmount` trả `true`. */
export function toCounterPaymentRequest(method: CounterMethod, values: CounterPaymentFormValues): CounterPaymentRequest {
  return { method, receivedAmount: toWholeNumber(values.receivedAmount) };
}
