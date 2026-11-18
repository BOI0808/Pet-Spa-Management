"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/lib/api/types";
import { usePet } from "@/lib/queries/pets";
import { checkInRoute } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import { rowMoment } from "@/features/appointments/appointments";

/** “Spa”, “Lưu trú” (nhận) hoặc “Trả” dưới giờ của phiếu (ui-demo SW-07). */
function stubLabel(appointment: Appointment, today: string) {
  if (appointment.type === "Spa") return "Spa";
  return rowMoment(appointment, today).label === "trả" ? "Trả" : "Lưu trú";
}

function TodayItem({ appointment, today, selected }: { appointment: Appointment; today: string; selected: boolean }) {
  const pet = usePet(appointment.petId);
  const isHotel = appointment.type === "Hotel";
  return (
    <li>
      <Link
        href={checkInRoute(appointment.appointmentId)}
        // `replace`: chọn phiếu khác không chồng thêm mục lịch sử; `scroll: false` để danh sách không nhảy lên đầu.
        replace
        scroll={false}
        aria-current={selected ? "true" : undefined}
        className={`grid grid-cols-[64px_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border bg-white text-ink transition-colors hover:border-[#9ec4c9] ${
          selected ? "border-lagoon shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line"
        }`}
      >
        <span
          className={`flex h-full flex-col items-center justify-center border-r border-dashed border-line py-2 text-center ${
            isHotel ? "bg-[#f1effc]" : "bg-lagoon-25"
          }`}
        >
          <b className={`text-[15px] tabular-nums ${isHotel ? "text-[#4a3fa6]" : "text-lagoon-700"}`}>
            {toStoreTime(rowMoment(appointment, today).iso)}
          </b>
          <span className="text-[11px] text-muted">{stubLabel(appointment, today)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2.5 px-3 py-2">
          {pet.isPending ? (
            <Skeleton className="size-[34px] rounded-[11px]" />
          ) : (
            <PetAvatar species={pet.data?.species ?? null} size="sm" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{appointment.petName ?? pet.data?.name ?? "Thú cưng"}</span>
            <span className="block truncate text-xs text-muted">{appointment.customerName}</span>
            {/* Badge dưới tên (không để cột riêng): cột danh sách chỉ 340px, để cột riêng thì tên bé bị cắt. */}
            <span className="mt-1 block">
              <StatusBadge status={appointment.status} />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

type TodayListProps = {
  appointments: Appointment[] | undefined;
  isPending: boolean;
  error: ReactNode;
  selectedId: string | null;
  today: string;
};

/** SW-07 vùng 1 – các lịch hôm nay, phiếu đang chọn viền Lagoon. */
export function TodayList({ appointments, isPending, error, selectedId, today }: TodayListProps) {
  let content;
  if (isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải lịch hẹn" className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  } else if (error) {
    content = error;
  } else if (!appointments || appointments.length === 0) {
    content = <p className="text-muted">Hôm nay không có lịch hẹn nào.</p>;
  } else {
    content = (
      <ul className="flex flex-col gap-2">
        {appointments.map((appointment) => (
          <TodayItem
            key={appointment.appointmentId}
            appointment={appointment}
            today={today}
            selected={appointment.appointmentId === selectedId}
          />
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader title="Lịch hẹn hôm nay">
        {appointments && <span className="text-[13px] text-muted">{appointments.length} lịch</span>}
      </CardHeader>
      <CardBody className="p-3">{content}</CardBody>
    </Card>
  );
}
