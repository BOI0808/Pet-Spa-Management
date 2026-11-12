import type { ReactNode } from "react";

export type BadgeTone = "st-1" | "st-2" | "st-3" | "st-4" | "st-5" | "st-6" | "pay-0" | "pay-1" | "neutral";

// `.badge.st-*`, `.badge.pay-*`, `.badge.neutral` của ui-demo.
const TONE_CLASS: Record<BadgeTone, string> = {
  "st-1": "bg-st-pending-bg text-st-pending",
  "st-2": "bg-st-confirmed-bg text-st-confirmed",
  "st-3": "bg-st-received-bg text-st-received",
  "st-4": "bg-st-active-bg text-st-active",
  "st-5": "bg-st-completed-bg text-st-completed",
  "st-6": "bg-st-cancelled-bg text-st-cancelled",
  "pay-0": "bg-[#fff1cc] text-[#7a4b00]",
  "pay-1": "bg-success-50 text-success",
  neutral: "bg-line-soft text-muted",
};

const SIZE_CLASS = {
  md: "h-6 px-2.5 text-xs",
  lg: "h-7 px-3 text-[13px]",
} as const;

type BadgeProps = { tone: BadgeTone; size?: keyof typeof SIZE_CLASS; children: ReactNode };

/** Nhãn trạng thái: chấm tròn + chữ, không chỉ dựa vào màu (Design-System 4.1). */
export function Badge({ tone, size = "md", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none before:size-1.5 before:rounded-full before:bg-current before:opacity-75 before:content-[''] ${TONE_CLASS[tone]} ${SIZE_CLASS[size]}`}
    >
      {children}
    </span>
  );
}
