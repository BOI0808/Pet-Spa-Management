import type { AppointmentType } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

/** Bộ lọc loại lịch của MW-04: `?type=Spa|Hotel`, thiếu hoặc sai giá trị thì hiện tất cả. */
export type TypeFilter = "all" | AppointmentType;

export function parseTypeFilter(value: string | null): TypeFilter {
  return value === "Spa" || value === "Hotel" ? value : "all";
}

/** Đường dẫn MW-04 kèm `?type=` và `?appointmentId=` (User-Flows 2.3); tham số không cần thì bỏ. */
export function buildPendingHref({ filter, appointmentId }: { filter: TypeFilter; appointmentId?: string }) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("type", filter);
  if (appointmentId) params.set("appointmentId", appointmentId);
  const query = params.toString();
  return query ? `${ROUTES.pending}?${query}` : ROUTES.pending;
}
