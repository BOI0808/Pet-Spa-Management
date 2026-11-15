import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/api/endpoints/notifications";
import type { NotificationPage } from "@/lib/api/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  /** Chuông trên thanh trên: chỉ cần `unread` nên tải trang 1 cỡ 1. */
  unread: ["notifications", "unread"] as const,
  infinite: (pageSize: number) => ["notifications", "infinite", pageSize] as const,
};

/** Chuông tự làm mới 60 giây/lần (UI-Screens khung CW, vùng D – Đề xuất). */
const UNREAD_REFETCH_MS = 60_000;

/** Số thông báo chưa đọc cho chuông; `enabled` khi đã có phiên (thanh trên nằm ngoài SessionGate). */
export function useUnreadNotificationCount({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => listNotifications({ page: 1, pageSize: 1 }),
    select: (page) => page.unread,
    enabled,
    refetchInterval: UNREAD_REFETCH_MS,
  });
}

/** Danh sách CW-12, “Xem thêm” tải trang kế tiếp; `page` do hook tự tăng. */
export function useInfiniteNotifications(pageSize: number) {
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(pageSize),
    queryFn: ({ pageParam }) => listNotifications({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

/** Đánh dấu một thông báo đã đọc ngay trong bộ đệm (danh sách + số trên chuông), giảm `unread` đi 1. */
function markReadInCache(page: NotificationPage, notificationId: string): NotificationPage {
  const target = page.items.find((item) => item.notificationId === notificationId);
  return {
    ...page,
    items: target && !target.isRead
      ? page.items.map((item) => (item === target ? { ...item, isRead: true } : item))
      : page.items,
    unread: Math.max(0, page.unread - 1),
  };
}

/**
 * Bấm thông báo chưa đọc → POST /notifications/{id}/read, không chờ kết quả (UI-Screens CW-12): cập nhật bộ đệm
 * trước để chấm và số trên chuông đổi ngay. Lỗi thì tải lại để trạng thái khớp backend.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      queryClient.setQueryData<NotificationPage>(notificationKeys.unread, (page) =>
        page ? markReadInCache(page, notificationId) : page,
      );
      queryClient.setQueriesData<InfiniteData<NotificationPage, number>>(
        { queryKey: [...notificationKeys.all, "infinite"] },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => markReadInCache(page, notificationId)),
          },
      );
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
