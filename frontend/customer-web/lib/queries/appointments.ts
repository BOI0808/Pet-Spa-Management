import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpaAppointment, getSpaSlots, type SpaSlotParams } from "@/lib/api/endpoints/appointments";

export const appointmentKeys = {
  all: ["appointments"] as const,
};

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: SpaSlotParams) => ["spa-slots", params] as const,
};

export function useSpaSlots(params: SpaSlotParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: spaSlotKeys.list(params), queryFn: () => getSpaSlots(params), enabled });
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
