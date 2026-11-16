import type { ApiError } from "@/lib/api/errors";
import type { HotelAvailability, HotelPricingRow, Pet } from "@/lib/api/types";
import type { AvailabilityView } from "./components/hotel-stay";
import { formatDayMonth, formatWeekdayShort } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDays, daysBetween, toStoreDateTime } from "@/lib/time";

/** Bốn ô của vùng 3: ngày “YYYY-MM-DD”, giờ “HH:mm” theo múi giờ cửa hàng; chuỗi rỗng khi chưa nhập. */
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

export type StayValidation = {
  errors: StayErrors;
  /** Đã nhập cả hai ngày nhưng ngày trả không sau ngày nhận: khóa nút gửi, Tạm tính ghi “Chưa hợp lệ”. */
  checkOutTooEarly: boolean;
};

/**
 * Kiểm tra ở web trước khi gọi API (UI-Screens CW-07): đủ 4 ô; ngày trả sau ngày nhận (số đêm ≥ 1, nên thời điểm trả
 * cũng sau thời điểm nhận); thời điểm nhận không ở quá khứ. `now` truyền vào để hàm thuần khi render.
 */
export function validateStay(times: StayTimes, now: number): StayValidation {
  const errors: StayErrors = {};
  for (const field of Object.keys(REQUIRED_MESSAGES) as StayField[]) {
    if (!isFilled(field, times[field])) errors[field] = REQUIRED_MESSAGES[field];
  }
  const checkOutTooEarly =
    !errors.checkInDate && !errors.checkOutDate && daysBetween(times.checkInDate, times.checkOutDate) < 1;
  if (checkOutTooEarly) errors.checkOutDate = CHECK_OUT_BEFORE_MESSAGE;
  if (!errors.checkInDate && !errors.checkInTime && Date.parse(checkInAt(times)) <= now) {
    errors.checkInTime = CHECK_IN_PAST_MESSAGE;
  }
  return { errors, checkOutTooEarly };
}

/**
 * Ô nhận lỗi 400 của `GET /hotel/availability`, `POST /appointments/hotel`. Backend chỉ trả `detail` là các câu lỗi
 * nối lại, không có tên trường (lib/api/errors.ts), nên dựa vào câu của backend: nói về ngày trả → ô Ngày trả; nói về
 * thời điểm nhận → ô Giờ nhận. Không nhận ra thì trả `null` để hiện `ErrorAlert` chung.
 */
export function stayFieldOfBadRequest(detail: string | null): StayField | null {
  const text = (detail ?? "").toLocaleLowerCase("vi-VN");
  if (text.includes("ngày trả") || text.includes("thời điểm trả")) return "checkOutDate";
  if (text.includes("thời điểm nhận") || text.includes("ngày nhận")) return "checkInTime";
  return null;
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

/** “Chó Poodle, nhóm Nhỏ” – thẻ chọn thú cưng (UI demo CW-07 vùng 2). */
export function describeHotelPet(pet: Pet) {
  return `${SPECIES_LABELS[pet.species]} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
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

// ── Dùng chung CW-07 (đặt lưu trú) và CW-10 (đổi lịch lưu trú) ──
/** Tự kiểm tra còn chỗ sau 400ms kể từ lần sửa cuối (UI-Screens CW-07, Đề xuất). */
export const AVAILABILITY_DELAY_MS = 400;
export const STAY_FULL_REASON = "Hết chỗ trong thời gian đã chọn.";

/** Ô nhận lỗi 400; `null` khi không phải 400 hoặc không xác định được ô. */
export function stayFieldOfError(error: ApiError | null) {
  return error?.status === 400 ? stayFieldOfBadRequest(error.detail) : null;
}

/** Thử lại có ích khi mất mạng, quá tải (429) hoặc lỗi server; lỗi 4xx khác thử lại vẫn ra như cũ. */
export function isRetryableError(error: ApiError) {
  return error.kind !== "http" || error.status === 429 || (error.status ?? 0) >= 500;
}

/**
 * Số đêm, tiền lưu trú chỉ để xem: có kết quả `GET /hotel/availability` thì dùng `nights`, `estimatedAmount` của API
 * (BR-22); chưa có thì tính ở web theo ngày và `GET /hotel/pricing`.
 */
export function estimateStay(
  times: StayTimes,
  errors: StayErrors,
  apiResult: HotelAvailability | undefined,
  price: HotelPricingRow | null,
) {
  const datesOk = Boolean(times.checkInDate && times.checkOutDate && !errors.checkInDate && !errors.checkOutDate);
  const nights = apiResult?.nights ?? (datesOk ? daysBetween(times.checkInDate, times.checkOutDate) : null);
  const amount =
    apiResult?.estimatedAmount ?? (price && nights !== null ? nights * (price.pricePerNight + price.foodPerNight) : null);
  return { nights, amount };
}

type AvailabilityViewInput = {
  /** Đủ dữ liệu để kiểm tra (thú cưng + 4 ô hợp lệ). */
  hasParams: boolean;
  /** Đã hết thời gian chờ sau lần sửa cuối. */
  isSettled: boolean;
  isFull: boolean;
  /** CW-10: API báo hết chỗ nhưng có thể do chính lịch đang đổi. */
  isOwnHold?: boolean;
  isPending: boolean;
  /** Lỗi của lần kiểm tra (chỉ khi `isSettled`). */
  error: ApiError | null;
  /** Ô nhận lỗi 400 của lần kiểm tra; có ô thì lỗi hiện dưới ô, không hiện alert. */
  errorField: StayField | null;
  data: HotelAvailability | undefined;
  refetch: () => void;
};

/** Kết quả kiểm tra còn chỗ hiện ở thẻ Thời gian (vùng 3 của CW-07, vùng 6 của CW-10). */
export function buildAvailabilityView(input: AvailabilityViewInput): AvailabilityView {
  const { hasParams, isSettled, isFull, isOwnHold = false, isPending, error, errorField, data, refetch } = input;
  if (!hasParams) return { kind: "idle" };
  if (isFull) return { kind: "full" };
  if (isOwnHold) return { kind: "own-hold" };
  if (!isSettled || isPending) return { kind: "checking" };
  if (error && !errorField) {
    // 400 không xác định được ô: không có nút thử lại vì gọi lại vẫn ra cùng lỗi.
    return { kind: "error", error, onRetry: isRetryableError(error) ? refetch : undefined };
  }
  if (data && !error) return { kind: "available", nights: data.nights };
  return { kind: "idle" };
}
