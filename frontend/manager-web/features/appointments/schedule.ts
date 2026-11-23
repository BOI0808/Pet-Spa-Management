import type { Appointment, AppointmentDetail } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
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

/**
 * Thời gian hai dòng của cột “Thời gian” ở MW-03 (UI-Screens MW-03 vùng 2): spa “06/10/2026” + “09:00 – 11:00”;
 * lưu trú “08/10, 09:00” + “đến 10/10, 17:00”. Thiếu mốc thời gian thì trả chuỗi rỗng.
 */
export function formatListSchedule(appointment: Appointment) {
  if (appointment.type === "Spa") {
    if (!appointment.slotStart) return { primary: "", secondary: "" };
    const range = appointment.slotEnd
      ? `${toStoreTime(appointment.slotStart)} – ${toStoreTime(appointment.slotEnd)}`
      : toStoreTime(appointment.slotStart);
    return { primary: formatStoreDate(toStoreDate(appointment.slotStart)), secondary: range };
  }

  if (!appointment.plannedCheckIn || !appointment.plannedCheckOut) return { primary: "", secondary: "" };
  const dayTime = (iso: string) => `${formatDayMonth(toStoreDate(iso))}, ${toStoreTime(iso)}`;
  return { primary: dayTime(appointment.plannedCheckIn), secondary: `đến ${dayTime(appointment.plannedCheckOut)}` };
}
