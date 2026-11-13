import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatDayMonth, formatWeekdayShort } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDays, daysBetween, toStoreDateTime } from "@/lib/time";

// Hàm thuần của phần lưu trú ở SW-06, chép từ CW-07 của Giang (PR #50, thẻ 109 – chưa merge lúc làm thẻ 124) và giữ
// cùng tên, cùng luật kiểm tra để hai web báo lỗi giống nhau. Bỏ `describeHotelPet`: SW-06 dùng chung thẻ thú cưng
// cho cả hai tab.

/** Bốn ô “Thời gian gửi và đón”: ngày “YYYY-MM-DD”, giờ “HH:mm” theo múi giờ cửa hàng; chuỗi rỗng khi chưa nhập. */
export type StayTimes = {
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
};

export type StayField = keyof StayTimes;
export type StayErrors = Partial<Record<StayField, string>>;

export const EMPTY_STAY_TIMES: StayTimes = { checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "" };

const REQUIRED_MESSAGES: Record<StayField, string> = {
  checkInDate: "Vui lòng chọn ngày nhận.",
  checkInTime: "Vui lòng chọn giờ nhận.",
  checkOutDate: "Vui lòng chọn ngày trả.",
  checkOutTime: "Vui lòng chọn giờ trả.",
};

export const CHECK_OUT_BEFORE_MESSAGE = "Ngày trả phải sau ngày nhận.";
export const CHECK_IN_PAST_MESSAGE = "Thời điểm nhận đã qua, vui lòng chọn thời điểm khác.";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isFilled(field: StayField, value: string) {
  return (field === "checkInDate" || field === "checkOutDate" ? DATE_PATTERN : TIME_PATTERN).test(value);
}

/**
 * Kiểm tra ở web trước khi gọi API (UI-Screens CW-07): đủ 4 ô; ngày trả sau ngày nhận (số đêm ≥ 1, nên thời điểm trả
 * cũng sau thời điểm nhận); thời điểm nhận không ở quá khứ. `now` truyền vào để hàm thuần khi render.
 */
export function validateStay(times: StayTimes, now: number): StayErrors {
  const errors: StayErrors = {};
  for (const field of Object.keys(REQUIRED_MESSAGES) as StayField[]) {
    if (!isFilled(field, times[field])) errors[field] = REQUIRED_MESSAGES[field];
  }
  if (!errors.checkInDate && !errors.checkOutDate && daysBetween(times.checkInDate, times.checkOutDate) < 1) {
    errors.checkOutDate = CHECK_OUT_BEFORE_MESSAGE;
  }
  if (!errors.checkInDate && !errors.checkInTime && Date.parse(checkInAt(times)) <= now) {
    errors.checkInTime = CHECK_IN_PAST_MESSAGE;
  }
  return errors;
}

export function checkInAt(times: StayTimes) {
  return toStoreDateTime(times.checkInDate, times.checkInTime);
}

export function checkOutAt(times: StayTimes) {
  return toStoreDateTime(times.checkOutDate, times.checkOutTime);
}

/** “2026-10-16”, “09:00” → “T6 16/10, 09:00” (UI demo CW-07 vùng 5). */
export function formatStayMoment(date: string, time: string) {
  return `${formatWeekdayShort(date)} ${formatDayMonth(date)}, ${time}`;
}

/** Các đêm của kỳ lưu trú: “16/10 và 17/10”; nhiều hơn 3 đêm thì “từ 16/10 đến 19/10”. */
export function describeNights(checkInDate: string, nights: number) {
  const dates = Array.from({ length: nights }, (_, index) => formatDayMonth(addDays(checkInDate, index)));
  if (dates.length <= 1) return dates.join("");
  if (dates.length > 3) return `từ ${dates[0]} đến ${dates[dates.length - 1]}`;
  return `${dates.slice(0, -1).join(", ")} và ${dates[dates.length - 1]}`;
}

/** “mèo nhóm Vừa” trong câu còn chỗ. */
export function describeCageFit(pet: Pet) {
  return `${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
}

/** Đơn giá lưu trú theo loài và nhóm kích cỡ của bé; `null` khi cửa hàng chưa thiết lập. */
export function findStayPrice(pricing: HotelPricingRow[] | undefined, pet: Pet | null) {
  if (!pricing || !pet) return null;
  return pricing.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup) ?? null;
}
