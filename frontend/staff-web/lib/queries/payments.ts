import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordCounterPayment } from "@/lib/api/endpoints/payments";
import { appointmentKeys } from "@/lib/queries/appointments";

/**
 * Ghi nhận thanh toán tại quầy (SW-09). Cùng tên với manager-web. Khoản thanh toán của lịch nằm dưới khóa `appointments`
 * (`appointmentKeys.payments`), nên thành công hay lỗi 409 (sai thời điểm, khoản đã được thu ở nơi khác…) đều tải lại mọi
 * khóa `appointments`: danh sách khoản cần thu, SW-07 bước 2, SW-02 nút “Thu tiền” cùng thấy dữ liệu mới (SA 6.6).
 */
export function useRecordCounterPayment() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  return useMutation({
    mutationFn: recordCounterPayment,
    onSuccess: invalidate,
    onError: (error) => {
      if (error.status === 409) void invalidate();
    },
  });
}
