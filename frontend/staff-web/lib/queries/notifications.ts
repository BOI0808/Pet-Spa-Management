import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/api/endpoints/notifications";
import type { NotificationPage } from "@/lib/api/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  /** Chuông trên thanh trên: chỉ cần `unread` nên tải trang 1 cỡ 1. */
  unread: ["notifications", "unread"] as const,
  infinite: (pageSize: number) => ["notifications", "infinite", pageSize] as const,
};

/** Chuông tự làm mới 60 giây/lần (UI-Screens 2.1, khung CW vùng D – Đề xuất; khung SW vùng C “như CW”). */
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

/** Danh sách SW-13, “Xem thêm” tải trang kế tiếp; `page` do hook tự tăng. */
export function useInfiniteNotifications(pageSize: number) {
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(pageSize),
    queryFn: ({ pageParam }) => listNotifications({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

type CachedNotifications = NotificationPage | InfiniteData<NotificationPage, number>;

function pagesOf(data: CachedNotifications | undefined): NotificationPage[] {
  if (!data) return [];
  return "pages" in data ? data.pages : [data];
}

/** Thông báo đã là “đã đọc” ở bất kỳ bộ đệm nào (bấm lặp, hoặc đã đọc ở nơi khác rồi tải lại). */
function isReadInCache(entries: [readonly unknown[], CachedNotifications | undefined][], notificationId: string) {
  return entries.some(([, data]) =>
    pagesOf(data).some((page) => page.items.some((item) => item.notificationId === notificationId && item.isRead)),
  );
}

/** Đánh dấu một thông báo đã đọc trong một trang của bộ đệm và giảm `unread` đi 1. */
function markReadInPage(page: NotificationPage, notificationId: string): NotificationPage {
  return {
    ...page,
    items: page.items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
    unread: Math.max(0, page.unread - 1),
  };
}

/**
 * Bấm thông báo chưa đọc → POST /notifications/{id}/read, không chờ kết quả (UI-Screens SW-13, như CW-12): cập nhật bộ đệm
 * trước để chấm và số trên chuông đổi ngay. Lỗi thì trả bộ đệm về như trước khi bấm rồi tải lại cho khớp backend.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = queryClient.getQueriesData<CachedNotifications>({ queryKey: notificationKeys.all });
      // Đã đọc rồi thì không trừ `unread` lần nữa.
      if (isReadInCache(snapshot, notificationId)) return { snapshot };

      queryClient.setQueryData<NotificationPage>(notificationKeys.unread, (page) =>
        page ? markReadInPage(page, notificationId) : page,
      );
      queryClient.setQueriesData<InfiniteData<NotificationPage, number>>(
        { queryKey: [...notificationKeys.all, "infinite"] },
        (data) => data && { ...data, pages: data.pages.map((page) => markReadInPage(page, notificationId)) },
      );
      return { snapshot };
    },
    onError: (_error, _notificationId, context) => {
      context?.snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
