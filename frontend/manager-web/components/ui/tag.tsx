import type { ReactNode } from "react";

type TagTone = "default" | "ok";

// `.tag`, `.tag-ok` của ui-demo. Chỉ khai báo tông đang dùng; thêm tông khác khi có màn cần.
const TONE_CLASS: Record<TagTone, string> = {
  default: "bg-line-soft text-ink",
  ok: "bg-success-50 text-success",
};

/** Nhãn mô tả ngắn (“Đang cung cấp”, “Đã ngừng”); không dùng cho trạng thái lịch hẹn (đã có Badge). */
export function Tag({ tone = "default", children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
