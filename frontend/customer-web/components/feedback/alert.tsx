import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "info" | "warn" | "success" | "danger" | "neutral";

// `.alert-*` của ui-demo: nền, viền và màu biểu tượng theo loại.
const TONE: Record<AlertTone, { box: string; icon: string; iconName: IconName }> = {
  info: { box: "border-[#C7DAF1] bg-info-50", icon: "text-info", iconName: "info" },
  warn: { box: "border-[#F1D9A2] bg-[#FFF6E3]", icon: "text-[#B87400]", iconName: "alert" },
  success: { box: "border-[#BFE0CA] bg-success-50", icon: "text-success", iconName: "check-circle" },
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger", iconName: "x-circle" },
  neutral: { box: "border-line bg-mist", icon: "text-muted", iconName: "info" },
};

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  className?: string;
  children: ReactNode;
};

/** Cảnh báo, gợi ý nghiệp vụ nội tuyến (SA 6.1). Lỗi từ API dùng ErrorAlert. */
export function Alert({ tone = "info", title, className = "", children }: AlertProps) {
  const style = TONE[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}>
      <Icon name={style.iconName} className={`mt-px size-[18px] ${style.icon}`} />
      <div>
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}
