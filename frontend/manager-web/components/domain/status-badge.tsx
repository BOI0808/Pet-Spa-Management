import type { AppointmentStatus, PaymentStatus } from "@/lib/api/types";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";

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

// `.badge.pay-0` (#FFF1CC / #7A4B00, trùng token st-pending) và `.badge.pay-1` (success-50 / success) của ui-demo.
const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  Unpaid: "bg-st-pending-bg text-st-pending",
  Paid: "bg-success-50 text-success",
};

const SIZE_CLASS = {
  md: "h-6 px-2.5 text-xs",
  lg: "h-7 px-3 text-[13px]",
} as const;

const BADGE_CLASS =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none before:size-1.5 before:rounded-full before:bg-current before:opacity-75 before:content-['']";

type BadgeSize = keyof typeof SIZE_CLASS;

type StatusBadgeProps = {
  status: AppointmentStatus;
  size?: BadgeSize;
};

/** Huy hiệu trạng thái lịch hẹn: chấm tròn + chữ, màu không đứng một mình (`.badge` của ui-demo). */
export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <span className={`${BADGE_CLASS} ${SIZE_CLASS[size]} ${STATUS_CLASS[status]}`}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
  size?: BadgeSize;
};

/** Huy hiệu trạng thái khoản thanh toán: Chưa thanh toán (`pay-0`) / Đã thanh toán (`pay-1`). */
export function PaymentStatusBadge({ status, size = "md" }: PaymentStatusBadgeProps) {
  return (
    <span className={`${BADGE_CLASS} ${SIZE_CLASS[size]} ${PAYMENT_STATUS_CLASS[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
