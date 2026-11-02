import type { ReactNode } from "react";

/**
 * Ghi chú tông info (`.alert-info` của ui-demo: nền `info-50`, viền #C7DAF1 như `Alert` info của customer-web).
 * `Alert` của web quản lý mới có tông danger nên MW-07 dùng thành phần riêng này, không sửa file dùng chung (Frontend-Architecture 3.3).
 */
export function InfoNote({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-[#C7DAF1] bg-info-50 px-4 py-3.5 leading-5 ${className}`}>{children}</div>;
}
