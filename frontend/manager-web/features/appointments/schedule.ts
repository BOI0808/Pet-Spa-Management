import type { AppointmentDetail } from "@/lib/api/types";
import { toStoreDate, toStoreTime } from "@/lib/time";

/** “2026-10-06” → “06/10/2026”. */
export function formatStoreDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Thời gian của lịch hẹn theo múi giờ cửa hàng: spa “09:00 – 10:30, 06/10/2026”; lưu trú “Nhận 14:00, 06/10/2026 → trả 12:00, 08/10/2026”.
 * Thiếu mốc thời gian thì trả chuỗi rỗng.
 */
export function formatAppointmentSchedule(appointment: AppointmentDetail) {
  if (appointment.type === "Spa") {
    if (!appointment.slotStart) return "";
    const start = toStoreTime(appointment.slotStart);
    const date = formatStoreDate(toStoreDate(appointment.slotStart));
    return appointment.slotEnd ? `${start} – ${toStoreTime(appointment.slotEnd)}, ${date}` : `${start}, ${date}`;
  }

  if (!appointment.plannedCheckIn || !appointment.plannedCheckOut) return "";
  const checkIn = `${toStoreTime(appointment.plannedCheckIn)}, ${formatStoreDate(toStoreDate(appointment.plannedCheckIn))}`;
  const checkOut = `${toStoreTime(appointment.plannedCheckOut)}, ${formatStoreDate(toStoreDate(appointment.plannedCheckOut))}`;
  return `Nhận ${checkIn} → trả ${checkOut}`;
}
