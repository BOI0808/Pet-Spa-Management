import type { CounterMethod, CounterPaymentRequest } from "@/lib/api/types";
import { MAX_MONEY_AMOUNT, toWholeNumber } from "@/lib/number-input";

// SW-09 Thanh toán tại quầy – UI-Screens.md (FR-PAY-02; BR-07, BR-17). Ba hàm và hai hằng đầu chép từ manager-web
// (features/payments/forms.ts, MW-10·D1), giữ cùng tên.

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

// ── Riêng SW-09 ──

/**
 * So số tiền đang nhập với số phải trả để hiện “Tiền thối lại” hoặc “Còn thiếu” ngay khi gõ (vùng 6). Ô trống hoặc chưa
 * đọc được số → `null`, hai ô chỉ đọc để trống.
 */
export function compareReceived(value: string, amountDue: number) {
  const received = toWholeNumber(value);
  if (value.trim() === "" || Number.isNaN(received)) return null;
  return received >= amountDue
    ? { short: false as const, change: received - amountDue }
    : { short: true as const, missing: amountDue - received };
}

/** Câu riêng của màn cho các lỗi 409 hiện ở `ErrorAlert` (UI-Screens SW-09, Mã lỗi tại màn – Đề xuất). */
export const COUNTER_ERROR_MESSAGES: Partial<Record<string, string>> = {
  PAYMENT_NOT_DUE: "Khoản này chưa đến thời điểm thu.",
  COST_CONFIRMATION_PENDING: "Đang chờ khách xác nhận chi phí mới, chưa thu tiền lưu trú.",
  INVALID_TRANSITION: "Khoản này đã được ghi nhận thanh toán.",
};
