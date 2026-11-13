"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, Pet } from "@/lib/api/types";
import { formatDayMonth, formatMoney } from "@/lib/format";
import { TEMPERAMENT_LABELS } from "@/lib/labels";
import { useAppointmentDetail } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { estimateSpaAmount } from "../spa-estimate";

const MISSING = "–";

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-3.5 py-3">
      <dt className="text-xs leading-4 text-muted">{label}</dt>
      {children}
    </div>
  );
}

/** “14:00 – 16:00, 06/10” (UI-Screens MW-04 vùng 4). Chưa có “Giữ chỗ đến … gồm dọn dẹp” vì API chưa trả `busyUntil` (G-08). */
function formatSlot(slotStart: string, slotEnd: string) {
  return `${toStoreTime(slotStart)} – ${toStoreTime(slotEnd)}, ${formatDayMonth(toStoreDate(slotStart))}`;
}

/**
 * MW-04 vùng 4 của lịch spa: Dịch vụ, Khung giờ, Tạm tính (+ tính cách) – UI-Screens.md. Tên dịch vụ lấy từ `GET /appointments/{id}`;
 * tạm tính tính ở web từ bảng giá (`GET /services`) theo loài và nhóm kích cỡ, nên cần hồ sơ thú cưng (`pet`) đã tải.
 */
export function SpaAppointmentSummary({ appointment, pet }: { appointment: Appointment; pet: Pet | undefined }) {
  const detailQuery = useAppointmentDetail(appointment.appointmentId);
  const servicesQuery = useServices();
  const { slotStart, slotEnd } = appointment;

  const serviceItems = detailQuery.data?.services ?? [];
  const serviceNames = serviceItems.map((item) => item.name).filter((name): name is string => Boolean(name));

  function renderServices() {
    if (detailQuery.isPending) {
      return (
        <dd className="mt-1">
          <Skeleton className="h-10 rounded-lg" />
        </dd>
      );
    }
    if (detailQuery.isError) return <dd className="mt-0.5 text-xs text-muted">Chưa tải được danh sách dịch vụ.</dd>;
    return <dd className="mt-0.5 break-words font-semibold">{serviceNames.length > 0 ? serviceNames.join(", ") : MISSING}</dd>;
  }

  function renderEstimate() {
    if (detailQuery.isPending || servicesQuery.isPending) {
      return (
        <dd className="mt-1">
          <Skeleton className="h-10 rounded-lg" />
        </dd>
      );
    }
    if (detailQuery.isError || servicesQuery.isError) {
      return <dd className="mt-0.5 text-xs text-muted">Chưa tính được tạm tính vì chưa tải được dịch vụ hoặc bảng giá.</dd>;
    }
    if (!pet) return <dd className="mt-0.5 font-semibold">{MISSING}</dd>;

    const amount = estimateSpaAmount(
      servicesQuery.data,
      serviceItems.map((item) => item.serviceId),
      pet.species,
      appointment.sizeGroup,
    );
    if (amount === null) {
      return <dd className="mt-0.5 text-xs text-muted">Chưa có giá cho các dịch vụ này theo loài và nhóm kích cỡ.</dd>;
    }

    return (
      <>
        <dd className="mt-0.5 font-semibold">{formatMoney(amount)}</dd>
        <dd className="text-xs text-muted">Tính cách: {TEMPERAMENT_LABELS[pet.temperament].toLocaleLowerCase("vi-VN")}</dd>
      </>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
      <Tile label="Dịch vụ">{renderServices()}</Tile>
      <Tile label="Khung giờ">
        <dd className="mt-0.5 font-semibold">{slotStart && slotEnd ? formatSlot(slotStart, slotEnd) : MISSING}</dd>
      </Tile>
      <Tile label="Tạm tính">{renderEstimate()}</Tile>
    </dl>
  );
}
