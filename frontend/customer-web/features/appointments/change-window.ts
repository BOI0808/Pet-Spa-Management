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

/**
 * `now` truyền vào để hàm thuần khi render. `knownClosed`: backend đã trả 409 `CHANGE_WINDOW_CLOSED` cho lịch này.
 */
export function getChangeAccess(appointment: Appointment, now: number, knownClosed: boolean): ChangeAccess {
  if (FINISHED_STATUSES.includes(appointment.status)) return "hidden";
  if (!CHANGEABLE_STATUSES.includes(appointment.status) || knownClosed) return "locked";
  const base = changeDeadlineBase(appointment);
  if (!base) return "locked";
  return Date.parse(base) - now < MIN_CHANGE_DEADLINE_MINUTES * 60_000 ? "locked" : "open";
}

const NOW_TICK_MS = 30_000;

/** Giờ hiện tại, cập nhật 30 giây/lần để nút tự khóa khi khách để màn mở qua mốc 60 phút. */
export function useNow(intervalMs = NOW_TICK_MS) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
