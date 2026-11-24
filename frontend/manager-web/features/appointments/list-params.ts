import type { AppointmentStatus, AppointmentType } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

/** Thứ tự 7 trạng thái trong ô lọc (UI-Screens 2.4). */
export const APPOINTMENT_STATUS_ORDER: readonly AppointmentStatus[] = [
  "Pending",
  "Confirmed",
  "Received",
  "InProgress",
  "InStay",
  "Completed",
  "Cancelled",
];

/** Bộ lọc của MW-03, lưu trên URL: `?type=&status=&date=&page=` (User-Flows 2.3; Frontend-Conventions 8). */
export type AppointmentListFilters = {
  type?: AppointmentType;
  status?: AppointmentStatus;
  /** `YYYY-MM-DD` theo múi giờ cửa hàng. */
  date?: string;
  /** Đếm từ 1. */
  page: number;
};

/** Ngày đúng dạng `YYYY-MM-DD` và có thật (không nhận “2026-02-31”). */
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Giá trị thiếu hoặc sai thì bỏ qua (hiện tất cả; trang 1) thay vì báo lỗi. */
export function parseListFilters(searchParams: { get: (name: string) => string | null }): AppointmentListFilters {
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const page = Number(searchParams.get("page"));

  return {
    type: type === "Spa" || type === "Hotel" ? type : undefined,
    status: APPOINTMENT_STATUS_ORDER.find((item) => item === status),
    date: date !== null && isValidDate(date) ? date : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Đường dẫn MW-03 kèm các tham số đang dùng; tham số mặc định (không lọc, trang 1) thì bỏ. */
export function buildListHref(filters: AppointmentListFilters) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `${ROUTES.appointments}?${query}` : ROUTES.appointments;
}
