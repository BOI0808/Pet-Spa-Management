import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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

// Cùng khóa với customer-web.
export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
};

// Lịch trong ngày đổi theo tiến độ ở cửa hàng: danh sách và chi tiết tải lại 60 giây/lần (UI-Screens SW-02, Đề xuất).
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

/**
 * Gộp danh sách của nhiều trạng thái (giống customer-web): API chỉ lọc một trạng thái mỗi lần (G-06) nên gọi song song,
 * mỗi trạng thái một trang cỡ `pageSize`. `truncated` khi có trạng thái nhiều hơn một trang (phần dư không tải).
 */
export function useAppointmentsByStatuses(
  statuses: readonly AppointmentStatus[],
  params: Omit<AppointmentListParams, "status" | "page">,
) {
  return useQueries({
    queries: statuses.map((status) => {
      const listParams = { ...params, status, page: 1 };
      return {
        queryKey: appointmentKeys.list(listParams),
        queryFn: () => listAppointments(listParams),
        refetchInterval: APPOINTMENT_REFETCH_MS,
      };
    }),
    combine: (results) => {
      const error = results.find((result) => result.isError)?.error ?? null;
      const pages = results.map((result) => result.data);
      const loaded = pages.every((page) => page !== undefined);
      return {
        isPending: results.some((result) => result.isPending),
        error,
        items: loaded ? pages.flatMap((page) => page?.items ?? []) : [],
        truncated: pages.some((page) => page !== undefined && page.total > page.items.length),
        /** Lần tải xong gần nhất, để màn tính “hôm nay” theo cùng nhịp tải lại. */
        updatedAt: Math.max(0, ...results.map((result) => result.dataUpdatedAt)),
        refetch: () => results.forEach((result) => void result.refetch()),
      };
    },
  });
}

export function useAppointment(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
    enabled,
    refetchInterval: APPOINTMENT_REFETCH_MS,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}
