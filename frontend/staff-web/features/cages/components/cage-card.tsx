import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import type { Cage } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { checkOutRoute } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { cageState, type CageState } from "../cages";

// `.cage` của ui-demo: trống thì nền kẻ sọc nhạt, đang chứa viền Lagoon nhạt, ngừng sử dụng nền xám.
const CARD_CLASS: Record<CageState, string> = {
  free: "border-line bg-[repeating-linear-gradient(135deg,#fff_0_10px,#f8fbfb_10px_20px)]",
  busy: "border-[#a6d3d7] bg-white",
  off: "border-line bg-[#f1f4f5] text-muted",
};

const PILL: Record<CageState, { label: string; className: string }> = {
  free: { label: "Trống", className: "bg-success-50 text-success" },
  busy: { label: "Đang chứa", className: "bg-st-active-bg text-st-active" },
  off: { label: "Ngừng sử dụng", className: "bg-[#e1e7e9] text-muted" },
};

type CageCardProps = {
  cage: Cage;
  /** Giờ trả dự kiến là hôm nay hoặc đã qua (vùng 4): viền Apricot + nút “Trả thú cưng”. */
  dueToday: boolean;
  /** Lịch Đang lưu trú của bé (G-17); chưa tìm được thì không hiện nút, chỉ hiện giờ trả. */
  stayAppointmentId: string | null;
  today: string;
};

/** SW-08 vùng 3, 4 – một thẻ chuồng. */
export function CageCard({ cage, dueToday, stayAppointmentId, today }: CageCardProps) {
  const state = cageState(cage);
  const pill = PILL[state];
  const { occupant } = cage;
  const checkOutDate = occupant ? toStoreDate(occupant.plannedCheckOut) : "";
  const checkOutTime = occupant ? toStoreTime(occupant.plannedCheckOut) : "";

  return (
    <li
      className={`flex min-h-[168px] flex-col gap-2.5 rounded-2xl border p-3.5 ${CARD_CLASS[state]} ${
        dueToday ? "border-apricot!" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold">{cage.code}</h3>
        <span className={`ml-auto inline-flex h-[22px] items-center rounded-md px-2 text-xs font-semibold ${pill.className}`}>
          {pill.label}
        </span>
      </div>
      <p className="text-xs text-muted">
        {SPECIES_LABELS[cage.species]}, nhóm {SIZE_GROUP_LABELS[cage.sizeGroup]}
      </p>

      {occupant && (
        <>
          <div className="flex items-center gap-2.5">
            <PetAvatar species={cage.species} size="sm" />
            <div className="min-w-0">
              <div className="break-words font-semibold">{occupant.petName}</div>
              {/* Chỉ có loài của chuồng: `occupant` không có giống (ui-demo ghi “Mèo Ba Tư”). */}
              <div className="break-words text-xs text-muted">
                {SPECIES_LABELS[cage.species]}. Chủ: {occupant.customerName}
              </div>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted">
            <Icon name="clock" className="size-3.5" />
            {dueToday ? (
              <span className="font-semibold text-apricot-700">
                {checkOutDate === today
                  ? `Trả hôm nay ${checkOutTime}`
                  : `Quá hạn trả ${checkOutTime}, ${formatDayMonth(checkOutDate)}`}
              </span>
            ) : (
              <span>
                Trả dự kiến {checkOutTime}, {formatDayMonth(checkOutDate)}
              </span>
            )}
            {dueToday && stayAppointmentId && (
              <ButtonLink href={checkOutRoute(stayAppointmentId)} size="sm" className="ml-auto">
                Trả thú cưng
              </ButtonLink>
            )}
          </div>
        </>
      )}
      {state === "off" && <p className="mt-auto text-xs text-muted">Không tính vào sức chứa</p>}
    </li>
  );
}
