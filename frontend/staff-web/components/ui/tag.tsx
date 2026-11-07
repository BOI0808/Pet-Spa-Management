import type { ReactNode } from "react";

type TagTone = "default" | "size" | "walkin" | "ok" | "lock";

// `.tag`, `.tag-size` của ui-demo: nhãn mô tả (nhóm kích cỡ, tính cách); trạng thái lịch hẹn dùng Badge.
const TONE_CLASS: Record<TagTone, string> = {
  default: "bg-line-soft font-medium",
  size: "border border-line bg-white font-semibold",
  // Nhãn khách hàng ở SW-04, SW-05 (`.tag-walkin`, `.tag-ok`, `.tag-lock` của ui-demo).
  walkin: "bg-apricot-50 font-medium text-apricot-700",
  ok: "bg-success-50 font-medium text-success",
  lock: "bg-danger-50 font-medium text-danger",
};

export function Tag({ tone = "default", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-xs ${tone === "default" || tone === "size" ? "text-ink" : ""} ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
