import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type AlertTone = "danger" | "info";

// `.alert-*` của ui-demo: nền, viền và màu biểu tượng theo tông (cùng bộ màu với Alert của customer-web).
const TONE: Record<AlertTone, { box: string; icon: string; iconName: IconName }> = {
  danger: { box: "border-[#EFC3BE] bg-danger-50", icon: "text-danger", iconName: "x-circle" },
  info: { box: "border-[#C7DAF1] bg-info-50", icon: "text-info", iconName: "info" },
};

type AlertProps = {
  /** Mặc định `danger` để các nơi đang dùng `<Alert>` không đổi giao diện. */
  tone?: AlertTone;
  className?: string;
  children: ReactNode;
};

/**
 * Cảnh báo nghiệp vụ nội tuyến do web tự phát hiện (khác `ErrorAlert`: không nhận lỗi từ API).
 * Có tông danger và info; thêm tông warn / success khi có màn cần (Design-System 4.2).
 */
export function Alert({ tone = "danger", className = "", children }: AlertProps) {
  const style = TONE[tone];
  return (
    // Chỉ lỗi mới cần trình đọc màn hình đọc ngay; ghi chú tĩnh (info) thì không.
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${style.box} ${className}`}
    >
      <Icon name={style.iconName} className={`mt-px size-[18px] ${style.icon}`} />
      <div>{children}</div>
    </div>
  );
}
