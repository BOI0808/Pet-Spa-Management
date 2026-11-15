// Luật hiện nút Đổi/Hủy ở CW-09 vùng 8 và CW-10 (FR-CHG-01, FR-CHG-02, BR-08, UI-Screens G-03). Không gọi API.
import { useEffect, useState } from "react";
import type { Appointment, AppointmentStatus } from "@/lib/api/types";
import { STORE_INFO } from "@/lib/store-info";

/**
 * Hạn tự đổi/hủy cấu hình được 60–120 phút trước giờ hẹn (SA 7.2 `Booking.ChangeCancelDeadlineMinutes`), nhưng khách
 * không đọc được `GET /config` (G-03). Còn dưới 60 phút thì chắc chắn đã quá hạn với mọi cấu hình nên web khóa trước;
 * từ 60 đến 120 phút thì chỉ biết khi backend trả 409 `CHANGE_WINDOW_CLOSED`.
 */
export const MIN_CHANGE_DEADLINE_MINUTES = 60;

/** Khách chỉ tự đổi/hủy lịch Chờ xác nhận hoặc Đã xác nhận (BR-14, backend `EnsureCustomerCanChange`). */
export const CHANGEABLE_STATUSES: readonly AppointmentStatus[] = ["Pending", "Confirmed"];

/** Lịch đã kết thúc thì ẩn khối Đổi hoặc hủy (UI-Screens CW-09 vùng 8). */
const FINISHED_STATUSES: readonly AppointmentStatus[] = ["Completed", "Cancelled"];

export const CHANGE_LOCKED_MESSAGE = `Đã quá thời hạn tự đổi/hủy, vui lòng liên hệ hotline ${STORE_INFO.hotline} để được hỗ trợ.`;

/** `open`: bật 2 nút; `locked`: 2 nút xám + lý do; `hidden`: lịch đã hoàn tất hoặc đã hủy. */
export type ChangeAccess = "open" | "locked" | "hidden";

/** Giờ hẹn dùng để tính hạn: giờ bắt đầu khung giờ spa hoặc giờ nhận lưu trú (BR-08). */
export function changeDeadlineBase(appointment: Appointment) {
  return appointment.type === "Spa" ? appointment.slotStart : appointment.plannedCheckIn;
}

/** Thời điểm (ms) web tự khóa: `MIN_CHANGE_DEADLINE_MINUTES` phút trước giờ hẹn; `null` khi lịch không đổi được nữa. */
export function selfServiceLockAt(appointment: Appointment) {
  if (!CHANGEABLE_STATUSES.includes(appointment.status)) return null;
  const base = changeDeadlineBase(appointment);
  return base ? Date.parse(base) - MIN_CHANGE_DEADLINE_MINUTES * 60_000 : null;
}

/**
 * `lockReached`: đã qua `selfServiceLockAt` (từ `useTimeReached`). `knownClosed`: backend đã trả 409
 * `CHANGE_WINDOW_CLOSED` cho lịch này ở giờ hẹn hiện tại.
 */
export function getChangeAccess(appointment: Appointment, lockReached: boolean, knownClosed: boolean): ChangeAccess {
  if (FINISHED_STATUSES.includes(appointment.status)) return "hidden";
  if (!CHANGEABLE_STATUSES.includes(appointment.status) || knownClosed) return "locked";
  if (!changeDeadlineBase(appointment)) return "locked";
  return lockReached ? "locked" : "open";
}

// setTimeout chỉ nhận tối đa 2^31 - 1 ms (~24,8 ngày); xa hơn thì không đặt hẹn giờ.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * `true` khi đã tới thời điểm `at` (ms). Chỉ đặt một `setTimeout` đúng tới mốc đó, không chạy timer định kỳ;
 * `at = null` (lịch đã kết thúc, đã tiếp nhận…) thì không đặt gì.
 */
export function useTimeReached(at: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const delay = at - Date.now();
    if (delay > MAX_TIMEOUT_MS) return;
    // Luôn cập nhật bất đồng bộ (kể cả khi đã qua mốc) để `now` không cũ khi `at` đổi sau lúc dựng.
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, delay) + 50);
    return () => window.clearTimeout(timer);
  }, [at]);
  return at !== null && now >= at;
}
