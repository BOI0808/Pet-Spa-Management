"use client";

// CW-12 Thông báo – UI-Screens.md, UC-34, FR-NOT-01 → 06.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { isForbiddenError } from "@/lib/api/errors";
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  useUnreadNotificationCount,
} from "@/lib/queries/notifications";
import { getStoreToday } from "@/lib/time";
import { NotificationItem } from "../components/notification-item";
import {
  NOTIFICATION_TAB_LABELS,
  NOTIFICATION_TABS,
  parseNotificationTab,
  type NotificationTab,
} from "../notifications";

/** 20 thông báo mỗi lần “Xem thêm” (UI-Screens CW-12 vùng 3). */
const PAGE_SIZE = 20;
const PANEL_ID = "notification-tab-panel";

const TITLE = "Thông báo";
const DESCRIPTION = "Cập nhật về lịch hẹn của bạn.";

const EMPTY_TITLES: Record<NotificationTab, string> = {
  all: "Chưa có thông báo nào.",
  unread: "Không có thông báo chưa đọc.",
};

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

export function NotificationsSkeleton() {
  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <NotificationListSkeleton />
    </>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseNotificationTab(searchParams.get("tab"));
  // Hôm nay theo múi giờ cửa hàng, cố định trong lần mở màn (“Hôm qua, 21:12”).
  const [today] = useState(getStoreToday);

  const notifications = useInfiniteNotifications(PAGE_SIZE);
  const markRead = useMarkNotificationRead();
  // Số trên tab dùng chung bộ đệm với chuông (tự làm mới 60 giây/lần) để hai số luôn khớp; chưa có thì lấy từ danh sách.
  const unreadCount = useUnreadNotificationCount();
  // Thông báo vừa bấm đọc ở tab “Chưa đọc” vẫn hiện (đổi sang kiểu đã đọc) tới khi đổi tab.
  const [readHere, setReadHere] = useState<ReadonlySet<string>>(() => new Set());

  function selectTab(next: NotificationTab) {
    setReadHere(new Set());
    router.replace(next === "all" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  function handleRead(notificationId: string) {
    if (tab === "unread") setReadHere((previous) => new Set(previous).add(notificationId));
    markRead.mutate(notificationId);
  }

  const pages = notifications.data?.pages ?? [];
  const unread = unreadCount.data ?? pages.at(-1)?.unread;

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
    const all = pages
      .flatMap((page) => page.items)
      .filter((item) => {
        if (seen.has(item.notificationId)) return false;
        seen.add(item.notificationId);
        return true;
      });
    // API không lọc được theo isRead (G-19): tab “Chưa đọc” lọc trên các trang đã tải.
    const items =
      tab === "unread" ? all.filter((item) => !item.isRead || readHere.has(item.notificationId)) : all;
    // Còn thông báo chưa đọc ở các trang chưa tải: không báo “không có”, gợi ý tải thêm.
    const moreUnreadToLoad = tab === "unread" && notifications.hasNextPage && (unread ?? 0) > 0;
    body = (
      <>
        {items.length === 0 ? (
          <Card className={LIST_CLASS}>
            {moreUnreadToLoad ? (
              <EmptyState
                icon="bell"
                title="Chưa thấy thông báo chưa đọc trong các thông báo đã tải."
                description="Bấm “Xem thêm” để tìm tiếp."
              />
            ) : (
              <EmptyState icon="bell" title={EMPTY_TITLES[tab]} />
            )}
          </Card>
        ) : (
          <Card className={LIST_CLASS}>
            <ul>
              {items.map((notification) => (
                <NotificationItem
                  key={notification.notificationId}
                  notification={notification}
                  today={today}
                  onRead={handleRead}
                />
              ))}
            </ul>
          </Card>
        )}
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
      <Tabs
        label="Lọc thông báo"
        panelId={PANEL_ID}
        value={tab}
        onChange={selectTab}
        items={NOTIFICATION_TABS.map((value) => ({
          value,
          label: NOTIFICATION_TAB_LABELS[value],
          count: value === "unread" ? unread : undefined,
        }))}
      />
      <div id={PANEL_ID} role="tabpanel" aria-label={NOTIFICATION_TAB_LABELS[tab]}>
        {body}
      </div>
    </>
  );
}
