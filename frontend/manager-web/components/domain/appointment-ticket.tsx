import Link from "next/link";
import type { Species } from "@/lib/api/types";
import { PetAvatar } from "./pet-avatar";

type AppointmentTicketProps = {
  /** Đích khi bấm phiếu; bấm chỉ đổi `?appointmentId=` nên dùng replace, không thêm mục lịch sử. */
  href: string;
  selected: boolean;
  /** Lịch lưu trú dùng cuống tím nhạt (`.t-stub.hotel`), lịch spa dùng cuống Lagoon nhạt. */
  variant: "spa" | "hotel";
  /** Dòng lớn của cuống: giờ hẹn (spa) hoặc ngày nhận (lưu trú). */
  stubTop: string;
  /** Dòng nhỏ của cuống: “Hôm nay”, “T4 07/10” (spa) hoặc “→ ngày trả” (lưu trú). */
  stubBottom: string;
  /** `null` khi chưa biết loài (hồ sơ đang tải hoặc tải lỗi): hiện ô xám thay hình. */
  species: Species | null;
  title: string;
  subtitle: string;
};

/** Phiếu hẹn rút gọn của danh sách MW-04 (`.ticket.compact` của ui-demo): cuống có khuyết tròn + thân. */
export function AppointmentTicket({
  href,
  selected,
  variant,
  stubTop,
  stubBottom,
  species,
  title,
  subtitle,
}: AppointmentTicketProps) {
  const isHotel = variant === "hotel";
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={`grid grid-cols-[84px_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-white transition-colors focus-visible:outline-[3px] focus-visible:outline-lagoon/40 ${
        selected ? "border-lagoon shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line hover:border-[#A9C6CB]"
      }`}
    >
      {/* Hai khuyết tròn ở mép trên và dưới của đường đứt; nền khuyết trùng nền trang (`--notch` = mist). */}
      <span
        className={`relative flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-line px-2 py-2.5 text-center before:absolute before:-right-2 before:-top-[9px] before:size-[15px] before:rounded-full before:border before:border-line before:bg-mist before:content-[''] after:absolute after:-right-2 after:-bottom-[9px] after:size-[15px] after:rounded-full after:border after:border-line after:bg-mist after:content-[''] ${
          isHotel ? "bg-[#F1EFFC]" : "bg-lagoon-25"
        }`}
      >
        <span className={`text-[17px] font-bold leading-6 tabular-nums ${isHotel ? "text-[#4A3FA6]" : "text-lagoon-700"}`}>
          {stubTop}
        </span>
        <span className="mt-0.5 text-xs leading-4 text-muted">{stubBottom}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3.5 px-3.5 py-2.5">
        {species ? (
          <PetAvatar species={species} size="sm" />
        ) : (
          <span aria-hidden="true" className="size-[34px] shrink-0 rounded-[11px] bg-line-soft" />
        )}
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{subtitle}</span>
        </span>
      </span>
    </Link>
  );
}
