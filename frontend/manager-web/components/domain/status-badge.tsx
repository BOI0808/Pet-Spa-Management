import type { AppointmentStatus } from "@/lib/api/types";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";

// Màu theo `.badge.st-1` … `.st-6` của ui-demo (token `st-*` trong globals.css); Đang thực hiện và Đang lưu trú cùng st-4.
const STATUS_CLASS: Record<AppointmentStatus, string> = {
  Pending: "bg-st-pending-bg text-st-pending",
  Confirmed: "bg-st-confirmed-bg text-st-confirmed",
  Received: "bg-st-received-bg text-st-received",
  InProgress: "bg-st-active-bg text-st-active",
  InStay: "bg-st-active-bg text-st-active",
  Completed: "bg-st-completed-bg text-st-completed",
  Cancelled: "bg-st-cancelled-bg text-st-cancelled",
};

const SIZE_CLASS = {
  md: "h-6 px-2.5 text-xs",
  lg: "h-7 px-3 text-[13px]",
} as const;

type StatusBadgeProps = {
  status: AppointmentStatus;
  size?: keyof typeof SIZE_CLASS;
};

/** Huy hiệu trạng thái lịch hẹn: chấm tròn + chữ, màu không đứng một mình (`.badge` của ui-demo). */
export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none before:size-1.5 before:rounded-full before:bg-current before:opacity-75 before:content-[''] ${SIZE_CLASS[size]} ${STATUS_CLASS[status]}`}
    >
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}
