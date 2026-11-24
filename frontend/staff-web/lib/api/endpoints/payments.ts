import { apiClient } from "@/lib/api/client";
import type { CounterPaymentRequest, PaymentStatusResult } from "@/lib/api/types";

// Cùng tên hàm với manager-web. Lễ tân không gọi được GET /payments (chỉ quản lý, G-07) nên staff-web chỉ có hàm ghi;
// danh sách khoản của một lịch đọc bằng `listAppointmentPayments` (endpoints/appointments.ts).

/**
 * POST /payments/{id}/counter – ghi nhận thanh toán tại quầy, LT hoặc QL (FR-PAY-02). Chỉ gửi `method` và `receivedAmount`.
 * Sai thời điểm → 409 PAYMENT_NOT_DUE; tiền nhận thấp hơn số phải trả → 409 AMOUNT_MISMATCH; tiền lưu trú khi lịch chờ khách
 * xác nhận chi phí mới → 409 COST_CONFIRMATION_PENDING; khoản đã thanh toán → 409 INVALID_TRANSITION; không tìm thấy → 404.
 */
export async function recordCounterPayment({
  paymentId,
  method,
  receivedAmount,
}: { paymentId: string } & CounterPaymentRequest) {
  const { data } = await apiClient.post<PaymentStatusResult>(`/payments/${encodeURIComponent(paymentId)}/counter`, {
    method,
    receivedAmount,
  } satisfies CounterPaymentRequest);
  return data;
}
