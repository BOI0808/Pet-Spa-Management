"use client";

import { AppointmentTicket } from "@/components/domain/appointment-ticket";
import type { Appointment } from "@/lib/api/types";
import { formatDayMonth, formatWeekdayShort } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { usePet } from "@/lib/queries/pets";
import { getStoreToday, toStoreDate, toStoreTime } from "@/lib/time";

const MISSING = "–";

/** “Hôm nay” hoặc “T4 07/10” (UI-Screens MW-04 vùng 2). */
function formatDayLabel(iso: string) {
  const date = toStoreDate(iso);
  return date === getStoreToday() ? "Hôm nay" : `${formatWeekdayShort(date)} ${formatDayMonth(date)}`;
}

/** Cuống phiếu: spa là giờ bắt đầu + ngày; lưu trú là “ngày nhận” + “→ ngày trả”. */
function getStub(appointment: Appointment) {
  if (appointment.type === "Spa") {
    const start = appointment.slotStart;
    return { top: start ? toStoreTime(start) : MISSING, bottom: start ? formatDayLabel(start) : MISSING };
  }
  const checkIn = appointment.plannedCheckIn;
  const checkOut = appointment.plannedCheckOut;
  return {
    top: checkIn ? formatDayMonth(toStoreDate(checkIn)) : MISSING,
    bottom: checkOut ? `→ ${formatDayMonth(toStoreDate(checkOut))}` : MISSING,
  };
}

type PendingTicketItemProps = {
  appointment: Appointment;
  selected: boolean;
  href: string;
};

/**
 * Một phiếu trong danh sách chờ xác nhận. Danh sách `GET /appointments` không có loài nên gọi
 * `GET /pets/{petId}` để vẽ hình thú cưng; cùng khóa với thẻ chi tiết nên phiếu đang chọn không gọi thêm.
 * Dòng phụ chỉ có loại lịch và tên khách: backend chưa trả lý do chờ (UI-Screens G-08).
 */
export function PendingTicketItem({ appointment, selected, href }: PendingTicketItemProps) {
  const petQuery = usePet(appointment.petId);
  const stub = getStub(appointment);

  return (
    <AppointmentTicket
      href={href}
      selected={selected}
      variant={appointment.type === "Spa" ? "spa" : "hotel"}
      stubTop={stub.top}
      stubBottom={stub.bottom}
      species={petQuery.data?.species ?? null}
      title={appointment.petName ?? "Thú cưng"}
      subtitle={`${APPOINTMENT_TYPE_LABELS[appointment.type]}, ${appointment.customerName ?? "Khách hàng"}`}
    />
  );
}
