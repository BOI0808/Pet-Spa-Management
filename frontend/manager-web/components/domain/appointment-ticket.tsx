import Link from "next/link";
import { Icon } from "@/components/icons";
import type { Species } from "@/lib/api/types";
import { PetAvatar } from "./pet-avatar";

type AppointmentTicketProps = {
  /** Có `href` thì phiếu là `<Link>`; bỏ trống thì là thẻ hiển thị tĩnh (Design-System 4.3). */
  href?: string;
  /** Mặc định `false` để giữ nút Back; màn chỉ đổi query chọn mục (như MW-04) tự bật `replace`. */
  replace?: boolean;
  scroll?: boolean;
  selected?: boolean;
  /** Lịch lưu trú dùng cuống tím nhạt (`.t-stub.hotel`), lịch spa dùng cuống Lagoon nhạt. */
  variant: "spa" | "hotel";
  /** Dòng lớn của cuống: giờ hẹn (spa) hoặc ngày nhận (lưu trú). */
  stubTop: string;
  /** Dòng nhỏ của cuống: “Hôm nay”, “T4 07/10” (spa) hoặc “→ ngày trả” (lưu trú). */
  stubBottom: string;
  /** Bỏ trống hoặc `null` khi API danh sách chưa có loài: hiện biểu tượng trung tính thay hình loài. */
  species?: Species | null;
  title: string;
  subtitle: string;
  className?: string;
};

/** Phiếu hẹn rút gọn dùng chung (`.ticket.compact` của ui-demo): cuống có khuyết tròn + thân. */
export function AppointmentTicket({
  href,
  replace = false,
  scroll,
  selected = false,
  variant,
  stubTop,
  stubBottom,
  species = null,
  title,
  subtitle,
  className = "",
}: AppointmentTicketProps) {
  const isHotel = variant === "hotel";
  const baseClass = `grid grid-cols-[84px_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-white ${
    selected ? "border-lagoon shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line"
  }`;

  const content = (
    <>
      {/* Hai khuyết tròn ở mép trên và dưới của đường đứt; nền khuyết trùng nền trang (`--notch` = mist). */}
      <span
        className={`relative flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-line px-2 py-2.5 text-center before:absolute before:-right-2 before:-top-[9px] before:size-[15px] before:rounded-full before:border before:border-line before:bg-mist before:content-[''] after:absolute after:-right-2 after:-bottom-[9px] after:size-[15px] after:rounded-full after:border after:border-line after:bg-mist after:content-[''] ${
          isHotel ? "bg-hotel-50" : "bg-lagoon-25"
        }`}
      >
        <span className={`text-[17px] font-bold leading-6 tabular-nums ${isHotel ? "text-hotel-700" : "text-lagoon-700"}`}>
          {stubTop}
        </span>
        <span className="mt-0.5 text-xs leading-4 text-muted">{stubBottom}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3.5 px-3.5 py-2.5">
        {species ? (
          <PetAvatar species={species} size="sm" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[34px] shrink-0 place-items-center rounded-[11px] border border-line-soft bg-mist text-muted"
          >
            <Icon name="paw" className="size-4" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{subtitle}</span>
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        replace={replace}
        scroll={scroll}
        aria-current={selected ? "true" : undefined}
        className={`${baseClass} transition-colors focus-visible:outline-[3px] focus-visible:outline-lagoon/40 ${
          selected ? "" : "hover:border-[#A9C6CB]"
        } ${className}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`${baseClass} ${className}`}>{content}</div>;
}
