import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "@/lib/api/endpoints/appointments";

// MW-04 lấy một trang 50 lịch chờ xác nhận (UI-Screens MW-04). Lọc theo loại và sắp theo giờ hẹn làm ở web.
export const PENDING_PAGE_SIZE = 50;

// Số lịch chờ ở thanh bên làm mới 60 giây/lần (UI-Screens 2.1 vùng C).
const PENDING_COUNT_REFETCH_MS = 60_000;

// Mọi khóa lịch hẹn bắt đầu bằng `all` để sau này một thao tác ghi (xác nhận, từ chối) tải lại cả danh sách lẫn huy hiệu.
export const appointmentKeys = {
  all: ["appointments"] as const,
  pending: () => [...appointmentKeys.all, "pending"] as const,
  pendingCount: () => [...appointmentKeys.all, "pending-count"] as const,
};

/** Lịch `Pending` của cả spa và lưu trú cho MW-04. */
export function usePendingAppointments() {
  return useQuery({
    queryKey: appointmentKeys.pending(),
    queryFn: () => listAppointments({ status: "Pending", page: 1, pageSize: PENDING_PAGE_SIZE }),
  });
}

/** Số lịch `Pending` cho huy hiệu thanh bên: chỉ cần `total` nên xin 1 dòng. */
export function usePendingCount({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.pendingCount(),
    queryFn: () => listAppointments({ status: "Pending", page: 1, pageSize: 1 }),
    select: (page) => page.total,
    enabled,
    refetchInterval: PENDING_COUNT_REFETCH_MS,
  });
}
