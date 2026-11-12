import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  confirmHotelAppointment,
  getHotelSuggestions,
  listAppointments,
  rejectAppointment,
} from "@/lib/api/endpoints/appointments";
import { toApiError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";

// Backend giới hạn `pageSize` tối đa 100 và luôn sắp theo `CreatedAt` tăng dần;
// tạm tải hết các trang `Pending` (tối đa 1.000 lịch) để web sắp theo giờ hẹn gần nhất, đếm đúng và tìm đủ `?appointmentId=`.
export const PENDING_PAGE_SIZE = 100;
const MAX_PENDING_PAGES = 10;

// Danh sách MW-04 và huy hiệu thanh bên dùng chung chu kỳ làm mới 60 giây khi tab đang hiển thị (Frontend-Architecture 5.1).
const PENDING_REFRESH_MS = 60_000;

export type PendingAppointmentsResult = {
  items: Appointment[];
  total: number;
  /** `true` khi tổng số lịch `Pending` vượt quá số dòng tải tối đa trên web. */
  isTruncated: boolean;
};

// Mọi khóa lịch hẹn bắt đầu bằng `all` để sau này một thao tác ghi (xác nhận, từ chối) tải lại cả danh sách lẫn huy hiệu.
export const appointmentKeys = {
  all: ["appointments"] as const,
  pending: () => [...appointmentKeys.all, "pending"] as const,
  pendingCount: () => [...appointmentKeys.all, "pending-count"] as const,
  suggestions: (appointmentId: string) => [...appointmentKeys.all, "suggestions", appointmentId] as const,
};

async function fetchAllPendingAppointments(): Promise<PendingAppointmentsResult> {
  const firstPage = await listAppointments({
    status: "Pending",
    page: 1,
    pageSize: PENDING_PAGE_SIZE,
  });

  if (firstPage.total <= firstPage.items.length || firstPage.items.length < PENDING_PAGE_SIZE) {
    return {
      items: firstPage.items,
      total: firstPage.total,
      isTruncated: false,
    };
  }

  const totalPages = Math.ceil(firstPage.total / PENDING_PAGE_SIZE);
  const pagesToFetch = Math.min(totalPages, MAX_PENDING_PAGES);
  const restPages = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, index) =>
      listAppointments({
        status: "Pending",
        page: index + 2,
        pageSize: PENDING_PAGE_SIZE,
      }),
    ),
  );

  // Khử trùng phòng trường hợp có lịch vừa được xử lý làm dịch ranh giới trang giữa các request.
  const seen = new Set<string>();
  const items: Appointment[] = [];
  for (const page of [firstPage, ...restPages]) {
    for (const item of page.items) {
      if (!seen.has(item.appointmentId)) {
        seen.add(item.appointmentId);
        items.push(item);
      }
    }
  }

  const latestTotal = restPages[restPages.length - 1]?.total ?? firstPage.total;
  return {
    items,
    total: latestTotal,
    isTruncated: totalPages > MAX_PENDING_PAGES,
  };
}

/**
 * Lịch `Pending` của cả spa và lưu trú cho MW-04.
 * Truyền `enabled: false` khi chỉ đọc lại từ cache (ví dụ huy hiệu thanh bên đang đứng ở MW-04).
 */
export function usePendingAppointments({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: appointmentKeys.pending(),
    queryFn: async () => {
      const result = await fetchAllPendingAppointments();
      // Đồng bộ `total` cho query đếm của thanh bên để rời MW-04 không bị lệch hay gọi đếm lại ngay khi dữ liệu còn tươi.
      queryClient.setQueryData(appointmentKeys.pendingCount(), result.total);
      return result;
    },
    enabled,
    refetchInterval: enabled ? PENDING_REFRESH_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Số lịch `Pending` cho huy hiệu thanh bên: chỉ cần `total` nên xin 1 dòng. */
export function usePendingCount({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.pendingCount(),
    queryFn: async () => {
      const page = await listAppointments({ status: "Pending", page: 1, pageSize: 1 });
      return page.total;
    },
    enabled,
    refetchInterval: enabled ? PENDING_REFRESH_MS : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Chuồng đề xuất cho lịch lưu trú Chờ xác nhận (FR-HTL-05). Chuồng trống thay đổi theo từng lịch được xử lý nên không giữ cache khi rời lịch
 * (`gcTime: 0`): mở lại lịch luôn tải mới, không hiện lại chuồng đề xuất cũ.
 */
export function useHotelSuggestions(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.suggestions(appointmentId),
    queryFn: () => getHotelSuggestions(appointmentId),
    gcTime: 0,
  });
}

function invalidatePending(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: appointmentKeys.pending() }),
    queryClient.invalidateQueries({ queryKey: appointmentKeys.pendingCount() }),
  ]);
}

/**
 * Sau lỗi 409 tải lại dữ liệu liên quan (Frontend-Conventions 5.1): lịch không còn chờ (INVALID_TRANSITION) thì tải lại danh sách và
 * huy hiệu (đề xuất của lịch đó chắc chắn báo 409 nên không tải); xung đột khác (CAGE_CONFLICT) thì tải lại đề xuất chuồng.
 */
function refetchAfterConflict(queryClient: QueryClient, appointmentId: string, error: unknown) {
  const apiError = toApiError(error);
  if (apiError.status !== 409) return;
  if (apiError.code === "INVALID_TRANSITION") {
    void invalidatePending(queryClient);
  } else {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.suggestions(appointmentId) });
  }
}

/** POST /appointments/{id}/confirm cho lịch lưu trú (FR-HTL-05). Việc tải lại danh sách sau khi thành công do màn hình làm (`useRemovePendingAppointment`). */
export function useConfirmHotelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmHotelAppointment,
    onError: (error, { appointmentId }) => refetchAfterConflict(queryClient, appointmentId, error),
  });
}

/** POST /appointments/{id}/reject (FR-HTL-06, FR-ASG-04): dùng chung cho lịch lưu trú và lịch spa. */
export function useRejectAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectAppointment,
    onError: (error, appointmentId) => refetchAfterConflict(queryClient, appointmentId, error),
  });
}

/**
 * Trả về hàm gỡ một lịch vừa xác nhận hoặc từ chối khỏi danh sách chờ rồi tải lại danh sách và huy hiệu.
 * Gỡ ngay trong cache để lịch đã xử lý không còn được tự chọn trong lúc chờ tải lại.
 */
export function useRemovePendingAppointment() {
  const queryClient = useQueryClient();
  return (appointmentId: string) => {
    queryClient.setQueryData<PendingAppointmentsResult>(appointmentKeys.pending(), (current) =>
      current && {
        ...current,
        items: current.items.filter((item) => item.appointmentId !== appointmentId),
        total: Math.max(current.total - 1, 0),
      },
    );
    void invalidatePending(queryClient);
  };
}
