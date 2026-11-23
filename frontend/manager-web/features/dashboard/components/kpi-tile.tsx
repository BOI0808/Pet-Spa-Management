import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type KpiTileProps = {
  icon: IconName;
  label: string;
  value: ReactNode;
  note: ReactNode;
  /** Thẻ nhấn mạnh (nền Apricot) cho việc cần Quản lý xử lý. */
  accent?: boolean;
  /** Bấm thẻ để mở màn chi tiết của số liệu. */
  href: string;
};

/** Thẻ số liệu của MW-02 vùng 2 (`.kpi`, `.kpi.accent` của ui-demo). */
export function KpiTile({ icon, label, value, note, accent = false, href }: KpiTileProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1.5 rounded-2xl border px-[18px] py-4 ${
        accent ? "border-[#F1D9A2] bg-apricot-50" : "border-line bg-white hover:border-[#A9C6CB]"
      }`}
    >
      <span className="flex items-center gap-2 text-[13px] text-muted">
        <Icon name={icon} className={`size-[18px] ${accent ? "text-[#B87400]" : "text-lagoon"}`} />
        {label}
      </span>
      <span className="text-[28px] font-bold leading-[34px] tabular-nums">{value}</span>
      <span className="text-xs leading-4 text-muted">{note}</span>
    </Link>
  );
}
