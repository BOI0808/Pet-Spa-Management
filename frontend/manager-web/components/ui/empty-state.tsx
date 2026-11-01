import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
  /** Hành động gợi ý (SA 6.6): nút người dùng làm được ngay. */
  action?: ReactNode;
};

/** Trạng thái rỗng: ô biểu tượng 88px nền Lagoon nhạt, tiêu đề, mô tả, hành động gợi ý (`.empty` của ui-demo). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-10 text-center">
      <span className="mb-1.5 grid size-[88px] place-items-center rounded-[28px] bg-lagoon-50 text-lagoon">
        <Icon name={icon} className="size-9" />
      </span>
      <h3>{title}</h3>
      <p className="max-w-[340px] text-muted">{description}</p>
      {action}
    </div>
  );
}
