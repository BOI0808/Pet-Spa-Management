import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import type { AttentionItem, AttentionKind } from "../dashboard";

/** Số việc hiện tối đa trong thẻ. */
const MAX_VISIBLE_ITEMS = 6;

// Biểu tượng và màu vòng tròn theo loại việc (`.row` trong thẻ “Cần chú ý” của ui-demo).
const KIND_STYLE: Record<AttentionKind, { icon: IconName; className: string }> = {
  costConfirmation: { icon: "alert", className: "bg-apricot-100 text-apricot-700" },
  hotelCheckIn: { icon: "bed", className: "bg-hotel-50 text-hotel-700" },
  hotelCheckOut: { icon: "handover", className: "bg-hotel-50 text-hotel-700" },
};

type AttentionCardProps = {
  /** `undefined` khi chưa tải xong. */
  items: AttentionItem[] | undefined;
  isError: boolean;
};

/** MW-02 vùng 4 – Cần chú ý (FR-EXE-08): chờ khách xác nhận chi phí, lưu trú nhận/trả trong ngày. */
export function AttentionCard({ items, isError }: AttentionCardProps) {
  const visible = items?.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = items ? items.length - MAX_VISIBLE_ITEMS : 0;

  return (
    <Card>
      <CardHeader title="Cần chú ý" />
      <CardBody>
        {isError ? (
          <p className="text-muted">Chưa tải được danh sách. Thử tải lại trang.</p>
        ) : visible === undefined ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <p className="flex items-center gap-2 text-muted">
            <Icon name="check-circle" className="size-[18px] text-success" />
            Hôm nay chưa có việc cần chú ý.
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {visible.map((item) => {
              const style = KIND_STYLE[item.kind];
              return (
                <li key={item.key}>
                  <Link href={ROUTES.appointmentDetail(item.appointmentId)} className="flex items-start gap-3">
                    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full ${style.className}`}>
                      <Icon name={style.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">{item.title}</span>
                      <span className="block break-words text-xs leading-[18px] text-muted">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {hiddenCount > 0 && (
          <p className="mt-3 text-xs text-muted">
            Còn {hiddenCount} việc khác, xem ở <Link href={ROUTES.appointments} className="font-semibold text-lagoon-700 underline">Lịch hẹn</Link>.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
