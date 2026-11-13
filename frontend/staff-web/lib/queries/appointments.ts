import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpaAppointment, getSpaSlots, type SpaSlotParams } from "@/lib/api/endpoints/appointments";

// Cùng khóa với customer-web. Danh sách, chi tiết lịch hẹn (SW-02, SW-03) thêm ở thẻ 125.
export const appointmentKeys = {
  all: ["appointments"] as const,
};

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: SpaSlotParams) => ["spa-slots", params] as const,
};

// Khách đứng ở quầy trong lúc lễ tân chọn giờ: tải lại định kỳ để mốc vừa kín, vừa trôi qua không còn hiện là chọn được.
const SPA_SLOT_REFETCH_MS = 60_000;

export function useSpaSlots(params: SpaSlotParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: spaSlotKeys.list(params),
    queryFn: () => getSpaSlots(params),
    enabled,
    refetchInterval: SPA_SLOT_REFETCH_MS,
  });
}

export function useCreateSpaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSpaAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
    // 409: tải lại mốc giờ (SA 6.6).
    onError: (error) => {
      if (error.code === "SLOT_FULL") void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
  });
}
