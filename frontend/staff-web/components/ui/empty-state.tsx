import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Hình riêng của màn; không có thì dùng ô 88px nền Lagoon nhạt + biểu tượng. */
  art?: ReactNode;
  icon?: IconName;
  /** Hành động gợi ý, thường là nút `secondary` (SA 6.6). */
  action?: ReactNode;
  className?: string;
};

/** Trạng thái rỗng (`.empty` của ui-demo): hình + một câu + hành động gợi ý. */
export function EmptyState({ title, description, art, icon = "paw", action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2.5 px-5 py-10 text-center ${className}`}>
      {art ?? (
        <span className="mb-1.5 grid size-[88px] place-items-center rounded-[28px] bg-lagoon-50 text-lagoon">
          <Icon name={icon} className="size-7" />
        </span>
      )}
      <h2>{title}</h2>
      {description && <p className="max-w-[340px] text-muted">{description}</p>}
      {action}
    </div>
  );
}
