import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

/**
 * Cảnh báo nghiệp vụ nội tuyến do web tự phát hiện (khác `ErrorAlert`: không nhận lỗi từ API).
 * Hiện chỉ có tông danger (`.alert-danger` của ui-demo, cùng bộ màu với `ErrorAlert`); thêm tông warn / info / success khi có màn cần (Design-System 4.2).
 */
export function Alert({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border border-[#EFC3BE] bg-danger-50 px-4 py-3.5 leading-5 ${className}`}>
      <Icon name="x-circle" className="mt-px size-[18px] text-danger" />
      <div>{children}</div>
    </div>
  );
}
