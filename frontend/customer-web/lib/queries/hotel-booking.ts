import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHotelAppointment,
  getHotelAvailability,
  type HotelAvailabilityParams,
} from "@/lib/api/endpoints/hotel-booking";
import { appointmentKeys } from "@/lib/queries/appointments";

export const hotelAvailabilityKeys = {
  all: ["hotel-availability"] as const,
  check: (params: HotelAvailabilityParams) => ["hotel-availability", params] as const,
};

// Chỗ trống thay đổi theo lịch của khách khác: kết quả cũ hơn 30 giây thì kiểm tra lại khi quay về màn.
const AVAILABILITY_STALE_MS = 30_000;

export function useHotelAvailability(params: HotelAvailabilityParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: hotelAvailabilityKeys.check(params),
    queryFn: () => getHotelAvailability(params),
    enabled,
    staleTime: AVAILABILITY_STALE_MS,
  });
}

export function useCreateHotelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHotelAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
    },
    // 409 NO_CAPACITY: gọi lại kiểm tra còn chỗ (UI-Screens CW-07).
    onError: (error) => {
      if (error.code === "NO_CAPACITY") void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
    },
  });
}
