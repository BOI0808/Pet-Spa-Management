import type { ReactNode } from "react";

type TagTone = "default" | "size" | "warn";

// `.tag`, `.tag-size`, `.tag-warn` của ui-demo: nhãn mô tả (nhóm kích cỡ, tính cách, cảnh báo); trạng thái lịch hẹn dùng Badge.
const TONE_CLASS: Record<TagTone, string> = {
  default: "bg-line-soft font-medium text-ink",
  size: "border border-line bg-white font-semibold text-ink",
  warn: "bg-apricot-50 font-medium text-apricot-700",
};

type TagProps = {
  tone?: TagTone;
  /** Cho xuống dòng khi chữ dài (thẻ cảnh báo trong phiếu hẹn – `.t-main .tag`). */
  wrap?: boolean;
  children: ReactNode;
};

export function Tag({ tone = "default", wrap = false, children }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[7px] px-[9px] text-xs ${
        wrap ? "min-h-6 py-[3px]" : "h-6 whitespace-nowrap"
      } ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
