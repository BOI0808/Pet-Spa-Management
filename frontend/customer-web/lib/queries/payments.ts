import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOnlinePayment } from "@/lib/api/endpoints/payments";
import type { PaymentGateway } from "@/lib/api/types";
import { appointmentKeys } from "@/lib/queries/appointments";

type StartOnlinePaymentInput = { paymentId: string; gateway: PaymentGateway };

/**
 * POST /payments/{id}/online – CW-09·D3 (UF-11). Lỗi nào cũng tải lại khoản thanh toán và lịch hẹn: khoản có thể vừa
 * được ghi nhận tại quầy (409 `INVALID_TRANSITION`) hoặc chưa đến thời điểm (409 `PAYMENT_NOT_DUE`).
 * Thành công thì trang chuyển sang cổng nên không cần làm mới gì.
 */
export function useStartOnlinePayment(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, gateway }: StartOnlinePaymentInput) => startOnlinePayment(paymentId, { gateway }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.payments(appointmentId), exact: true });
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId), exact: true });
    },
  });
}
