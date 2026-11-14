import Link from "next/link";
import type { ReactNode } from "react";

export type TicketStubTone = "spa" | "hotel" | "cancel";

// Nền và màu chữ của cuống theo `.t-stub`, `.t-stub.hotel`, `.t-stub.cancel` của ui-demo.
const STUB_CLASS: Record<TicketStubTone, { box: string; time: string }> = {
  spa: { box: "bg-lagoon-25", time: "text-lagoon-700" },
  hotel: { box: "bg-[#f1effc]", time: "text-[#4a3fa6]" },
  cancel: { box: "bg-[#f7f0ef]", time: "text-muted line-through decoration-1" },
};

// Hai khuyết tròn ở mép phải cuống, cùng màu nền trang.
const NOTCH_CLASS =
  "before:absolute before:-right-2 before:-top-[9px] before:size-[15px] before:rounded-full before:border before:border-line before:bg-mist before:content-[''] after:absolute after:-bottom-[9px] after:-right-2 after:size-[15px] after:rounded-full after:border after:border-line after:bg-mist after:content-['']";

type AppointmentTicketProps = {
  href: string;
  stub: { tone: TicketStubTone; time: string; date: string };
  /** Hình thú cưng. */
  media: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Thẻ cảnh báo dưới mô tả, ví dụ “Cần bạn xác nhận chi phí mới”. */
  alert?: ReactNode;
  /** Cột phải: badge trạng thái và mã lịch. */
  side: ReactNode;
};

/**
 * “Phiếu hẹn” (`.ticket` của ui-demo): cuống trái ngăn bằng nét đứt và 2 khuyết tròn, thân, cột phải.
 * Dưới 640px cột phải xuống dưới thân phiếu.
 */
export function AppointmentTicket({ href, stub, media, title, description, alert, side }: AppointmentTicketProps) {
  const stubClass = STUB_CLASS[stub.tone];
  return (
    <Link
      href={href}
      className="grid grid-cols-[104px_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-[#9ec4c9] max-[640px]:grid-cols-[84px_minmax(0,1fr)]"
    >
      <div
        className={`relative flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-line px-3 py-3.5 text-center ${stubClass.box} ${NOTCH_CLASS}`}
      >
        <span className={`text-xl font-bold leading-6 tabular-nums max-[640px]:text-[17px] ${stubClass.time}`}>
          {stub.time}
        </span>
        <span className="mt-0.5 text-xs leading-4 text-muted">{stub.date}</span>
      </div>
      <div className="flex min-w-0 items-center gap-3.5 px-[18px] py-3.5 max-[640px]:px-3.5">
        {media}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-semibold">{title}</div>
          {description && <div className="mt-0.5 break-words text-[13px] leading-5 text-muted">{description}</div>}
          {alert && <div className="mt-2">{alert}</div>}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center gap-2 px-[18px] py-3.5 max-[640px]:col-span-full max-[640px]:flex-row max-[640px]:items-center max-[640px]:justify-start max-[640px]:border-t max-[640px]:border-line-soft max-[640px]:py-2.5">
        {side}
      </div>
    </Link>
  );
}
