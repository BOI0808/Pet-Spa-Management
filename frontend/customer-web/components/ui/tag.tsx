import type { ReactNode } from "react";

type TagTone = "default" | "size";

// `.tag`, `.tag-size` của ui-demo: nhãn mô tả (nhóm kích cỡ, tính cách); trạng thái lịch hẹn dùng Badge.
const TONE_CLASS: Record<TagTone, string> = {
  default: "bg-line-soft font-medium",
  size: "border border-line bg-white font-semibold",
};

export function Tag({ tone = "default", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-xs text-ink ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
