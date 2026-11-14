// Ngày giờ theo múi giờ cửa hàng (Frontend-Architecture 8). Ngày dạng “YYYY-MM-DD”, giờ dạng “HH:mm”.

export const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";
const STORE_UTC_OFFSET = "+07:00";

// en-CA in ngày đúng dạng YYYY-MM-DD.
const STORE_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE });

/** Hôm nay theo múi giờ cửa hàng, không theo máy người dùng. */
export function getStoreToday() {
  return STORE_DATE_FORMAT.format(new Date());
}

/** “2026-10-06” + 1 → “2026-10-07”. */
export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** “14:00” + 90 → “15:30”; qua nửa đêm thì quay về đầu ngày: “23:30” + 60 → “00:30”. */
export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/** Ngày + mốc giờ → ISO 8601 có độ lệch, ví dụ “2026-10-06T09:00:00+07:00” (SA 5.1.4). */
export function toStoreDateTime(date: string, time: string) {
  return `${date}T${time}:00${STORE_UTC_OFFSET}`;
}

// en-GB in giờ 24 giờ dạng “HH:mm”.
const STORE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Thời điểm ISO 8601 từ API → ngày “YYYY-MM-DD” theo múi giờ cửa hàng. */
export function toStoreDate(isoDateTime: string) {
  return STORE_DATE_FORMAT.format(new Date(isoDateTime));
}

/** Thời điểm ISO 8601 từ API → giờ “HH:mm” theo múi giờ cửa hàng. */
export function toStoreTime(isoDateTime: string) {
  return STORE_TIME_FORMAT.format(new Date(isoDateTime));
}

/** Số ngày từ ngày `from` đến ngày `to` (“YYYY-MM-DD”), ví dụ 09/10 → 11/10 là 2. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Số đêm lưu trú tính theo ngày nhận và ngày trả ở múi giờ cửa hàng (UI-Screens CW-07 vùng 3). */
export function countNights(checkIn: string, checkOut: string) {
  return daysBetween(toStoreDate(checkIn), toStoreDate(checkOut));
}
