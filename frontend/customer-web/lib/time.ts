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

/** “14:00” + 90 → “15:30”. */
export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Ngày + mốc giờ → ISO 8601 có độ lệch, ví dụ “2026-10-06T09:00:00+07:00” (SA 5.1.4). */
export function toStoreDateTime(date: string, time: string) {
  return `${date}T${time}:00${STORE_UTC_OFFSET}`;
}
