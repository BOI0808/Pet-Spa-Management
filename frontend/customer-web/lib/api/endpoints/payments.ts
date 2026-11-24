import { apiClient } from "@/lib/api/client";
import type { OnlinePaymentCreated, OnlinePaymentRequest } from "@/lib/api/types";

/**
 * POST /payments/{id}/online – FR-PAY-03, UC-24. Chỉ khoản Spa chưa thanh toán của lịch spa đã hoàn tất, thuộc khách
 * đang đăng nhập (BR-09, BR-16). Body chỉ có `gateway`, số tiền do backend xác định (BR-17).
 * 403 lịch của người khác, 409 `PAYMENT_NOT_DUE` chưa đến thời điểm, 409 `INVALID_TRANSITION` khoản đã thanh toán.
 */
export async function startOnlinePayment(paymentId: string, body: OnlinePaymentRequest) {
  const { data } = await apiClient.post<OnlinePaymentCreated>(
    `/payments/${encodeURIComponent(paymentId)}/online`,
    body,
  );
  return data;
}
