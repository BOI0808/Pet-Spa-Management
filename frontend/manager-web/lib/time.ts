// Ngày giờ theo múi giờ cửa hàng (Frontend-Architecture 8). Ngày dạng “YYYY-MM-DD”, giờ dạng “HH:mm”.

export const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";

// en-CA in ngày đúng dạng YYYY-MM-DD.
const STORE_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE });
// en-GB + h23 in giờ 24 giờ dạng HH:mm, nửa đêm là “00:00”.
const STORE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Hôm nay theo múi giờ cửa hàng, không theo máy người dùng. */
export function getStoreToday() {
  return STORE_DATE_FORMAT.format(new Date());
}

/** Thời điểm ISO 8601 từ API → ngày theo múi giờ cửa hàng: “2026-10-06T07:00:00+00:00” → “2026-10-06”. */
export function toStoreDate(iso: string) {
  return STORE_DATE_FORMAT.format(new Date(iso));
}

/** Thời điểm ISO 8601 từ API → giờ theo múi giờ cửa hàng: “2026-10-06T07:00:00+00:00” → “14:00”. */
export function toStoreTime(iso: string) {
  return STORE_TIME_FORMAT.format(new Date(iso));
}
