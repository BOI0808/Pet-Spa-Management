import { apiClient } from "@/lib/api/client";
import type { CounterPaymentRequest, PaymentPage, PaymentStatus, PaymentStatusResult } from "@/lib/api/types";

export type PaymentListParams = {
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
};

/**
 * GET /payments – chỉ Quản lý (FR-PAY-04). Lịch hẹn tạo mới nhất trước; mặc định page = 1, pageSize = 20, tối đa 100.
 * Chưa lọc được theo `kind`, `method` ở backend (UI-Screens G-07) nên MW-10 lọc hai trường này ở web.
 */
export async function listPayments(params: PaymentListParams = {}) {
  const { data } = await apiClient.get<PaymentPage>("/payments", { params });
  return data;
}

/**
 * POST /payments/{id}/counter – ghi nhận thanh toán tại quầy, LT hoặc QL (FR-PAY-02). Chỉ gửi `method` và `receivedAmount`.
 * Sai thời điểm → 409 PAYMENT_NOT_DUE; tiền nhận thấp hơn số phải trả → 409 AMOUNT_MISMATCH; tiền lưu trú khi lịch chờ khách xác nhận
 * chi phí mới → 409 COST_CONFIRMATION_PENDING; khoản đã thanh toán → 409 INVALID_TRANSITION; không tìm thấy → 404 NOT_FOUND.
 */
export async function recordCounterPayment({
  paymentId,
  method,
  receivedAmount,
}: { paymentId: string } & CounterPaymentRequest) {
  const { data } = await apiClient.post<PaymentStatusResult>(`/payments/${paymentId}/counter`, {
    method,
    receivedAmount,
  } satisfies CounterPaymentRequest);
  return data;
}
