import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

type NotFoundStateProps = {
  /** Ví dụ “Không tìm thấy hồ sơ thú cưng”. */
  title: string;
  description?: string;
  /** Nút quay lại danh sách (UI-Screens 2.2). */
  action?: ReactNode;
  className?: string;
};

/** Hiển thị thay cho nội dung trang khi backend trả 404 (UI-Screens 2.2; cùng kiểu với ForbiddenState). */
export function NotFoundState({
  title,
  description = "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
  action,
  className = "",
}: NotFoundStateProps) {
  return (
    <div className={`flex flex-col items-start gap-3 ${className}`}>
      <div className="flex w-full items-start gap-3 rounded-xl border border-line bg-mist px-4 py-3.5 leading-5">
        <Icon name="info" className="mt-px size-[18px] text-muted" />
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted">{description}</div>
        </div>
      </div>
      {action}
    </div>
  );
}
