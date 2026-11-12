import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAppointments } from "@/lib/api/endpoints/appointments";
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
