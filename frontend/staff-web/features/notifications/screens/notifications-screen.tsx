"use client";

// SW-13 Thông báo (nhân viên spa) – UI-Screens.md, UC-34, FR-NOT-02, FR-NOT-04.
// Hành vi như CW-12 của Web Khách hàng; bố cục theo ui-demo SW-13 (một danh sách, không có tab Tất cả / Chưa đọc).
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { useInfiniteNotifications, useMarkNotificationRead } from "@/lib/queries/notifications";
import { getStoreToday } from "@/lib/time";
import { NotificationItem } from "../components/notification-item";

/** 20 thông báo mỗi lần “Xem thêm” (như CW-12). */
const PAGE_SIZE = 20;

const TITLE = "Thông báo";
const DESCRIPTION = "Phân công và thay đổi về lịch hẹn của bạn.";

// Danh sách rộng tối đa 860px như ui-demo.
const LIST_CLASS = "max-w-[860px] overflow-hidden";

function NotificationListSkeleton() {
  return (
    <Card className={LIST_CLASS}>
      <div aria-busy="true" aria-label="Đang tải">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="grid grid-cols-[40px_minmax(0,1fr)] gap-3.5 border-b border-line-soft px-5 py-4 last:border-b-0"
          >
            <Skeleton className="size-10 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NotificationsScreen() {
  // Hôm nay theo múi giờ cửa hàng, cố định trong lần mở màn (“Hôm qua, 21:12”).
  const [today] = useState(getStoreToday);
  const notifications = useInfiniteNotifications(PAGE_SIZE);
  const markRead = useMarkNotificationRead();

  let body;
  if (notifications.isPending) {
    body = <NotificationListSkeleton />;
  } else if (notifications.isError && !notifications.data) {
    // Lỗi khi tải thêm trang vẫn giữ các trang đã có (lỗi hiện dưới danh sách).
    body = isForbiddenError(notifications.error) ? (
      <ForbiddenState />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={notifications.error} className="w-full" />
        <Button onClick={() => void notifications.refetch()}>Thử lại</Button>
      </div>
    );
  } else {
    // Phân trang theo vị trí: có thông báo mới thì mục cuối trang trước bị đẩy sang trang sau → bỏ mục trùng.
    const seen = new Set<string>();
    const items = notifications.data.pages
      .flatMap((page) => page.items)
      .filter((item) => {
        if (seen.has(item.notificationId)) return false;
        seen.add(item.notificationId);
        return true;
      });
    body = (
      <>
        <Card className={LIST_CLASS}>
          {items.length === 0 ? (
            <EmptyState
              icon="bell"
              title="Chưa có thông báo nào."
              description="Khi bạn được phân công lịch mới hoặc một lịch của bạn bị hủy, thông báo sẽ hiện ở đây."
            />
          ) : (
            <ul>
              {items.map((notification) => (
                <NotificationItem
                  key={notification.notificationId}
                  notification={notification}
                  today={today}
                  onRead={(notificationId) => markRead.mutate(notificationId)}
                />
              ))}
            </ul>
          )}
        </Card>
        {notifications.hasNextPage && (
          <div className="mt-4 flex max-w-[860px] justify-center">
            <Button
              disabled={notifications.isFetchingNextPage}
              aria-busy={notifications.isFetchingNextPage || undefined}
              onClick={() => void notifications.fetchNextPage()}
            >
              {notifications.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
            </Button>
          </div>
        )}
        {notifications.isFetchNextPageError && (
          <ErrorAlert error={notifications.error} className="mt-3 max-w-[860px]" />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      {body}
    </>
  );
}
