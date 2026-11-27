// Luật hiển thị của SW-12 Lịch sử công việc (UI-Screens SW-12, FR-EXE-06, G-06).
import type { Appointment } from "@/lib/api/types";
import { toStoreDate } from "@/lib/time";

/**
 * Số lịch tải về một lần. API chưa lọc được theo khoảng ngày (G-06) nên web tải các lịch hoàn tất gần nhất
 * (backend xếp mới nhất trước khi `status=Completed`) rồi lọc theo tháng, chia trang ở web.
 */
export const HISTORY_FETCH_SIZE = 100;

/** Số dòng mỗi trang của bảng (UI-Screens SW-12 vùng 2: `pageSize=20`). */
export const HISTORY_PAGE_SIZE = 20;

/** Tháng của một lịch spa theo múi giờ cửa hàng, dạng “YYYY-MM”; lịch thiếu giờ hẹn → null. */
export function monthOf(appointment: Appointment) {
  return appointment.slotStart ? toStoreDate(appointment.slotStart).slice(0, 7) : null;
}

/** Các tháng có lịch trong danh sách, mới nhất trước (danh sách đã xếp mới nhất trước nhưng vẫn sắp lại cho chắc). */
export function listMonths(appointments: Appointment[]) {
  const months = new Set<string>();
  for (const appointment of appointments) {
    const month = monthOf(appointment);
    if (month) months.add(month);
  }
  return [...months].sort().reverse();
}

/** “2026-10” → “10/2026”. */
export function formatMonth(month: string) {
  const [year, value] = month.split("-");
  return `${value}/${year}`;
}

/** Số trang của bảng, ít nhất 1. */
export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
}
