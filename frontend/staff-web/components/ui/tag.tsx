import type { ReactNode } from "react";

type TagTone = "default" | "size" | "warn" | "walkin" | "ok" | "lock";

// `.tag`, `.tag-size`, `.tag-warn` của ui-demo: nhãn mô tả (nhóm kích cỡ, tính cách, cảnh báo); trạng thái lịch hẹn dùng Badge.
const TONE_CLASS: Record<TagTone, string> = {
  default: "bg-line-soft font-medium text-ink",
  size: "border border-line bg-white font-semibold text-ink",
  // Cảnh báo trong phiếu hẹn SW-02 (“Chờ khách xác nhận chi phí mới”) – giống customer-web.
  warn: "bg-apricot-50 font-medium text-apricot-700",
  // Nhãn khách hàng ở SW-04, SW-05 (`.tag-walkin`, `.tag-ok`, `.tag-lock` của ui-demo).
  walkin: "bg-apricot-50 font-medium text-apricot-700",
  ok: "bg-success-50 font-medium text-success",
  lock: "bg-danger-50 font-medium text-danger",
};

type TagProps = {
  tone?: TagTone;
  /** Cho xuống dòng khi chữ dài (thẻ cảnh báo, ghi chú hồ sơ trong phiếu hẹn – `.t-main .tag`). */
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
