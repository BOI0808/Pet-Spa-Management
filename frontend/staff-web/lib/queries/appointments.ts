import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpaAppointment,
  getAppointment,
  getSpaSlots,
  listAppointmentPayments,
  listAppointments,
  type AppointmentListParams,
  type SpaSlotParams,
} from "@/lib/api/endpoints/appointments";

// Cùng khóa với customer-web.
export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
};

// Lịch trong ngày đổi theo tiến độ ở cửa hàng: tải lại 60 giây/lần (UI-Screens SW-02, Đề xuất).
const APPOINTMENT_REFETCH_MS = 60_000;

type QueryToggle = { enabled?: boolean };

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

/** Danh sách lịch hẹn; tự tải lại 60 giây/lần để thấy lịch mới được giao, lịch vừa đổi trạng thái. */
export function useAppointments(params: AppointmentListParams) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => listAppointments(params),
    refetchInterval: APPOINTMENT_REFETCH_MS,
  });
}

type AppointmentQueryOptions = QueryToggle & {
  /** Tự tải lại 60 giây/lần: chỉ bật ở SW-03. Phiếu ở SW-02 không bật để mỗi phút không gọi thêm một request mỗi phiếu. */
  live?: boolean;
};

export function useAppointment(appointmentId: string, { enabled = true, live = false }: AppointmentQueryOptions = {}) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
    enabled,
    refetchInterval: live ? APPOINTMENT_REFETCH_MS : false,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}
