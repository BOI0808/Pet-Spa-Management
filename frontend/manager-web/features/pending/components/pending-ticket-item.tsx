"use client";

import { AppointmentTicket } from "@/components/domain/appointment-ticket";
import type { Appointment } from "@/lib/api/types";
import { formatDayMonth, formatWeekdayShort } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
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
 * Một phiếu trong danh sách chờ xác nhận. Không gọi `GET /pets/{petId}` cho từng phiếu để tránh N+1
 * request khi `GET /appointments` chưa trả `species`; hồ sơ thú cưng chỉ tải ở thẻ chi tiết khi chọn.
 * Bấm phiếu chỉ đổi `?appointmentId=` tại chỗ nên bật `replace` và giữ nguyên vị trí cuộn.
 * Dòng phụ chỉ có loại lịch và tên khách: backend chưa trả lý do chờ (UI-Screens G-08).
 */
export function PendingTicketItem({ appointment, selected, href }: PendingTicketItemProps) {
  const stub = getStub(appointment);

  return (
    <AppointmentTicket
      href={href}
      replace
      scroll={false}
      selected={selected}
      variant={appointment.type === "Spa" ? "spa" : "hotel"}
      stubTop={stub.top}
      stubBottom={stub.bottom}
      title={appointment.petName ?? "Thú cưng"}
      subtitle={`${APPOINTMENT_TYPE_LABELS[appointment.type]}, ${appointment.customerName ?? "Khách hàng"}`}
    />
  );
}
