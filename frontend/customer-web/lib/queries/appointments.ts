import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpaAppointment,
  getAppointment,
  getSpaSlots,
  listAppointmentPayments,
  listAppointments,
  type AppointmentListParams,
  type SpaSlotParams,
} from "@/lib/api/endpoints/appointments";
import type { AppointmentStatus } from "@/lib/api/types";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  infinite: (params: AppointmentListParams) => ["appointments", "infinite", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
};

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: SpaSlotParams) => ["spa-slots", params] as const,
};

// Khách có thể ở màn chọn giờ lâu: tải lại định kỳ để mốc vừa kín, vừa trôi qua không còn hiện là chọn được.
const SPA_SLOT_REFETCH_MS = 60_000;

// Lịch đang ở cửa hàng thay đổi theo tiến độ chăm sóc: chi tiết tải lại 30 giây/lần (Frontend-Architecture 5.1).
const LIVE_DETAIL_REFETCH_MS = 30_000;
const LIVE_STATUSES: readonly AppointmentStatus[] = ["Received", "InProgress"];

type QueryToggle = { enabled?: boolean };

export function useSpaSlots(params: SpaSlotParams, { enabled = true }: QueryToggle = {}) {
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

export function useAppointments(params: AppointmentListParams, { enabled = true }: QueryToggle = {}) {
  return useQuery({ queryKey: appointmentKeys.list(params), queryFn: () => listAppointments(params), enabled });
}

/** Danh sách tải thêm từng trang (“Xem thêm” ở CW-11); `page` do hook tự tăng. */
export function useInfiniteAppointments(params: Omit<AppointmentListParams, "page">, { enabled = true }: QueryToggle = {}) {
  return useInfiniteQuery({
    queryKey: appointmentKeys.infinite(params),
    queryFn: ({ pageParam }) => listAppointments({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled,
  });
}

export function useAppointment(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
    enabled,
    refetchInterval: (query) =>
      query.state.data && LIVE_STATUSES.includes(query.state.data.status) ? LIVE_DETAIL_REFETCH_MS : false,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}
