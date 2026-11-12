import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpaAppointment,
  getAppointment,
  getSpaSlots,
  listAppointmentPayments,
  listAppointments,
  type AppointmentListParams,
  type SpaSlotParams,
} from "@/lib/api/endpoints/appointments";
import type { AppointmentDetail, AppointmentStatus } from "@/lib/api/types";

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

/**
 * Gộp danh sách của nhiều trạng thái: API chỉ lọc một trạng thái mỗi lần (G-06) nên gọi song song từng trạng thái,
 * mỗi trạng thái một trang cỡ `pageSize`. `total` là tổng số thật từ backend, `truncated` khi có trạng thái
 * nhiều hơn một trang (phần dư không tải).
 */
export function useAppointmentsByStatuses(
  statuses: readonly AppointmentStatus[],
  params: Omit<AppointmentListParams, "status" | "page">,
) {
  return useQueries({
    queries: statuses.map((status) => {
      const listParams = { ...params, status, page: 1 };
      return { queryKey: appointmentKeys.list(listParams), queryFn: () => listAppointments(listParams) };
    }),
    combine: (results) => {
      const error = results.find((result) => result.isError)?.error ?? null;
      const pages = results.map((result) => result.data);
      const loaded = pages.every((page) => page !== undefined);
      return {
        isPending: results.some((result) => result.isPending),
        error,
        items: loaded ? pages.flatMap((page) => page?.items ?? []) : [],
        total: loaded ? pages.reduce((sum, page) => sum + (page?.total ?? 0), 0) : undefined,
        truncated: pages.some((page) => page !== undefined && page.total > page.items.length),
        refetch: () => results.forEach((result) => void result.refetch()),
      };
    },
  });
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

type AppointmentQueryOptions = QueryToggle & {
  /** Tải lại định kỳ khi lịch đang ở cửa hàng; chỉ bật ở CW-09, danh sách không cần. */
  live?: boolean;
};

export function useAppointment(appointmentId: string, { enabled = true, live = false }: AppointmentQueryOptions = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: async () => {
      const previous = queryClient.getQueryData<AppointmentDetail>(appointmentKeys.detail(appointmentId));
      const next = await getAppointment(appointmentId);
      // Đổi trạng thái (vd. vừa hoàn tất) thì khoản thanh toán có thể vừa phát sinh: tải lại.
      if (previous && previous.status !== next.status) {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.payments(appointmentId), exact: true });
      }
      return next;
    },
    enabled,
    refetchInterval: (query) =>
      live && query.state.data && LIVE_STATUSES.includes(query.state.data.status) ? LIVE_DETAIL_REFETCH_MS : false,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}
