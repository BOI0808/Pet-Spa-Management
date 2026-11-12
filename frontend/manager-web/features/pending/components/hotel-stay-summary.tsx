"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, Species } from "@/lib/api/types";
import { formatDayMonth, formatMoney, formatWeekdayShort } from "@/lib/format";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { estimateStay, getStayNights } from "../hotel-stay";

const MISSING = "–";

/** “09:00, T5 08/10” (UI-Screens MW-04 vùng 4; dùng thứ viết tắt như phiếu ở danh sách chờ). */
function formatMoment(iso: string) {
  const date = toStoreDate(iso);
  return `${toStoreTime(iso)}, ${formatWeekdayShort(date)} ${formatDayMonth(date)}`;
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-3.5 py-3">
      <dt className="text-xs leading-4 text-muted">{label}</dt>
      {children}
    </div>
  );
}

/** MW-04 vùng 4 của lịch lưu trú: Nhận, Trả (số đêm), Tạm tính – UI-Screens.md. `species` lấy từ hồ sơ thú cưng; chưa có thì chưa tính được tiền. */
export function HotelStaySummary({ appointment, species }: { appointment: Appointment; species: Species | undefined }) {
  const pricingQuery = useHotelPricing();
  const { plannedCheckIn, plannedCheckOut } = appointment;
  const nights = plannedCheckIn && plannedCheckOut ? getStayNights(plannedCheckIn, plannedCheckOut) : [];

  function renderEstimate() {
    if (pricingQuery.isPending) {
      return (
        <dd className="mt-1">
          <Skeleton className="h-10 rounded-lg" />
        </dd>
      );
    }
    if (pricingQuery.isError) return <dd className="mt-0.5 text-xs text-muted">Chưa tải được bảng giá lưu trú.</dd>;
    if (!species) return <dd className="mt-0.5 font-semibold">{MISSING}</dd>;

    const estimate = estimateStay(pricingQuery.data, species, appointment.sizeGroup, nights.length);
    if (!estimate) return <dd className="mt-0.5 text-xs text-muted">Chưa có giá lưu trú cho loài và nhóm kích cỡ này.</dd>;

    return (
      <>
        <dd className="mt-0.5 font-semibold">{formatMoney(estimate.total)}</dd>
        <dd className="text-xs text-muted">
          {estimate.nights} × ({formatMoney(estimate.pricePerNight)} + {formatMoney(estimate.foodPerNight)})
        </dd>
      </>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
      <Tile label="Nhận">
        <dd className="mt-0.5 font-semibold">{plannedCheckIn ? formatMoment(plannedCheckIn) : MISSING}</dd>
      </Tile>
      <Tile label="Trả">
        <dd className="mt-0.5 font-semibold">{plannedCheckOut ? formatMoment(plannedCheckOut) : MISSING}</dd>
        {nights.length > 0 && (
          <dd className="break-words text-xs text-muted">
            {nights.length} đêm: {nights.map((night) => formatDayMonth(night)).join(", ")}
          </dd>
        )}
      </Tile>
      <Tile label="Tạm tính">{renderEstimate()}</Tile>
    </dl>
  );
}
