"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Notification } from "@/lib/api/types";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { formatNotificationTime, NOTIFICATION_ICONS } from "../notifications";

type NotificationItemProps = {
  notification: Notification;
  today: string;
  /** Gọi khi khách bấm thông báo chưa đọc (đánh dấu đã đọc, không chờ kết quả). */
  onRead: (notificationId: string) => void;
};

// `.notif` của ui-demo: ô biểu tượng 40px · nội dung · thời gian.
const rowClass =
  "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3.5 px-5 py-4 text-left text-ink max-[640px]:grid-cols-[40px_minmax(0,1fr)] max-[640px]:px-4";

/**
 * Một thông báo (UI-Screens CW-12 vùng 3, 4). Có `appointmentId` → cả dòng là liên kết mở CW-09; không có mà chưa
 * đọc → nút chỉ đánh dấu đã đọc (đọc xong vẫn là nút, `aria-disabled`); đã đọc từ trước và không có lịch → chỉ hiển thị.
 */
export function NotificationItem({ notification, today, onRead }: NotificationItemProps) {
  const { notificationId, type, appointmentId, message, isRead, createdAt } = notification;
  const { icon, className } = NOTIFICATION_ICONS[type];
  const title = NOTIFICATION_TYPE_LABELS[type];
  const time = formatNotificationTime(createdAt, today);

  const content: ReactNode = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-xl ${className}`}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">
          {title}
          {!isRead && (
            <>
              <span
                aria-hidden="true"
                className="ml-2 inline-block size-2 rounded-full bg-lagoon align-middle"
              />
              <span className="sr-only"> (chưa đọc)</span>
            </>
          )}
        </span>
        <span className="mt-1 block break-words text-muted">{message}</span>
        {/* FR-NOT-06: khách mở chi tiết lịch để xác nhận hoặc từ chối chi phí mới (CW-09). */}
        {type === "CostConfirmation" && appointmentId && (
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lagoon-700">
            Xem và xác nhận
            <Icon name="chev-r" className="size-4" />
          </span>
        )}
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
        <Link href={ROUTES.appointmentDetail(appointmentId)} onClick={markRead} className={`${rowClass} hover:bg-mist`}>
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
