import { useMutation, useQueryClient } from "@tanstack/react-query";
import { respondCostConfirmation } from "@/lib/api/endpoints/appointments";
import { appointmentKeys, spaSlotKeys } from "@/lib/queries/appointments";
import { hotelAvailabilityKeys } from "@/lib/queries/hotel-booking";
import { petKeys } from "@/lib/queries/pets";

/**
 * POST /appointments/{id}/cost-confirmation/respond – CW-09 vùng 3 và CW-09·D2 (FR-EXE-11, UF-10).
 * Thành công hoặc lỗi nào cũng tải lại lịch hẹn: yêu cầu có thể vừa hết hạn và lịch đã bị hủy ở backend (SA 6.6).
 */
export function useRespondCostConfirmation(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accept: boolean) => respondCostConfirmation(appointmentId, { accept }),
    onSuccess: (_result, accept) => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Đồng ý: hồ sơ thú cưng cập nhật theo cân nặng thực tế. Từ chối: lịch hủy trả lại chỗ đã giữ.
      if (accept) void queryClient.invalidateQueries({ queryKey: petKeys.all });
      else {
        void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
        void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
      }
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
