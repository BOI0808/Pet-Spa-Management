import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

/** Lý do nút gửi bị khóa, đặt ngay dưới nút (`.btn-reason` của ui-demo) – CW-06, CW-07. */
export function DisabledReason({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
      <Icon name="lock" className="mt-px size-3.5" />
      {children}
    </p>
  );
}
