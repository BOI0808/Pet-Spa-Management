// Luật hiển thị của CW-10 Đổi lịch hẹn (UI-Screens.md, FR-CHG-01). Không gọi API.
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { formatDayMonth, formatWeekday, formatWeekdayShort } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { formatSlotRange, serviceNames } from "./appointments";

/** Vùng 2 “Lịch hiện tại”: “Mochi, thứ ba 06/10, 14:00 – 16:00. Tắm & sấy lông, Cắt tỉa lông.” */
export function describeCurrentAppointment(appointment: AppointmentDetail, petName: string) {
  if (appointment.type === "Spa" && appointment.slotStart) {
    const date = toStoreDate(appointment.slotStart);
    const services = serviceNames(appointment).join(", ");
    return `${petName}, ${formatWeekday(date)} ${formatDayMonth(date)}, ${formatSlotRange(appointment)}.${
      services ? ` ${services}.` : ""
    }`;
  }
  const { plannedCheckIn, plannedCheckOut } = appointment;
  if (plannedCheckIn && plannedCheckOut) {
    const checkIn = `${toStoreTime(plannedCheckIn)} ${formatDayMonth(toStoreDate(plannedCheckIn))}`;
    const checkOut = `${toStoreTime(plannedCheckOut)} ${formatDayMonth(toStoreDate(plannedCheckOut))}`;
    return `${petName}, nhận ${checkIn}, trả ${checkOut}.`;
  }
  return `${petName}.`;
}

/** Ô chọn thú cưng của CW-10: “Mochi, mèo, nhóm Vừa”. */
export function describePetOption(pet: Pet) {
  return `${pet.name}, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
}

/** “T5 08/10, 16:00 – 18:00” ở cột Sau khi đổi. */
export function formatNewSlot(date: string, start: string, end: string | undefined) {
  return `${formatWeekdayShort(date)} ${formatDayMonth(date)}, ${start}${end ? ` – ${end}` : ""}`;
}

export function sameIds(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Hai thời điểm ISO 8601 (có thể khác độ lệch) cùng một lúc. */
export function sameInstant(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b) && Date.parse(a as string) === Date.parse(b as string);
}

/** Khoảng [from, to) của hai kỳ lưu trú có giao nhau. */
export function rangesOverlap(fromA: string, toA: string, fromB: string, toB: string) {
  return Date.parse(fromA) < Date.parse(toB) && Date.parse(fromB) < Date.parse(toA);
}
