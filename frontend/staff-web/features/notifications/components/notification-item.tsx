"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Notification } from "@/lib/api/types";
import { appointmentDetailRoute } from "@/lib/routes";
import { formatNotificationTime, NOTIFICATION_ICONS, notificationTitle } from "../notifications";

type NotificationItemProps = {
  notification: Notification;
  today: string;
  /** Gọi khi nhân viên bấm thông báo chưa đọc (đánh dấu đã đọc, không chờ kết quả). */
  onRead: (notificationId: string) => void;
};

// `.notif` của ui-demo: ô biểu tượng 40px · nội dung · thời gian.
const rowClass =
  "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3.5 px-5 py-4 text-left text-ink max-[640px]:grid-cols-[40px_minmax(0,1fr)] max-[640px]:px-4";

/**
 * Một thông báo (UI-Screens SW-13 vùng 2, 3). Có `appointmentId` → cả dòng là liên kết mở SW-03; không có mà chưa
 * đọc → nút chỉ đánh dấu đã đọc (đọc xong vẫn là nút, `aria-disabled`); đã đọc từ trước và không có lịch → chỉ hiển thị.
 * Cùng cách làm với `NotificationItem` của Web Khách hàng (CW-12).
 */
export function NotificationItem({ notification, today, onRead }: NotificationItemProps) {
  const { notificationId, type, appointmentId, message, isRead, createdAt } = notification;
  const { icon, className } = NOTIFICATION_ICONS[type];
  const time = formatNotificationTime(createdAt, today);

  const content: ReactNode = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-xl ${className}`}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">
          {notificationTitle(notification)}
          {!isRead && (
            <>
              <span aria-hidden="true" className="ml-2 inline-block size-2 rounded-full bg-lagoon align-middle" />
              <span className="sr-only"> (chưa đọc)</span>
            </>
          )}
        </span>
        {/* Backend soạn sẵn: thú cưng, giờ hẹn; thông báo hủy có lý do (FR-NOT-04). */}
        <span className="mt-1 block break-words text-muted">{message}</span>
        <span className="mt-1.5 hidden text-xs text-muted tabular-nums max-[640px]:block">{time}</span>
      </span>
      <span className="whitespace-nowrap text-xs text-muted tabular-nums max-[640px]:hidden">{time}</span>
    </>
  );

  const unreadClass = isRead ? "" : "bg-[#FBFEFE]";
  const markRead = () => {
    if (!isRead) onRead(notificationId);
  };
  // Dòng bắt đầu là “chưa đọc” giữ nguyên là nút sau khi bấm đọc: đổi nút thành div sẽ làm mất focus bàn phím.
  const [startedUnread] = useState(!isRead);

  return (
    <li className={`border-b border-line-soft last:border-b-0 ${unreadClass}`}>
      {appointmentId ? (
        <Link href={appointmentDetailRoute(appointmentId)} onClick={markRead} className={`${rowClass} hover:bg-mist`}>
          {content}
        </Link>
      ) : startedUnread ? (
        <button
          type="button"
          onClick={markRead}
          aria-disabled={isRead || undefined}
          className={`${rowClass} ${isRead ? "cursor-default" : "cursor-pointer hover:bg-mist"}`}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
