import type { LifecycleStep } from "@/components/domain/lifecycle";
import type { Appointment, AppointmentStatus, AppointmentType, CancelReason } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { toStoreDate, toStoreTime } from "@/lib/time";

// Vòng đời MW-05 vùng 2 (UI-Screens: như CW-09 vùng 2).
const SPA_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "Received", "InProgress", "Completed"];
const HOTEL_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "InStay", "Completed"];

// Không lưu lịch sử trạng thái (G-02) nên bước đã đạt trước khi hủy suy ra từ lý do hủy, theo AppointmentLifecycle ở backend:
// vắng mặt chỉ hủy từ Đã xác nhận; không xác nhận chi phí hủy từ Đã tiếp nhận (spa) hoặc Đã xác nhận (lưu trú).
// Lý do khác (cửa hàng hủy, khách hủy) không biết chắc đã đến bước nào nên chỉ hiện bước Chờ xác nhận.
const REACHED_BEFORE_CANCEL: Record<AppointmentType, Partial<Record<CancelReason, AppointmentStatus>>> = {
  Spa: { NoShow: "Confirmed", CostNotConfirmed: "Received" },
  Hotel: { NoShow: "Confirmed", CostNotConfirmed: "Confirmed" },
};

/** “03/10, 20:14” – mốc dưới từng bước vòng đời. */
function formatStepTime(isoDateTime: string) {
  return `${formatDayMonth(toStoreDate(isoDateTime))}, ${toStoreTime(isoDateTime)}`;
}

/** Các bước của thanh vòng đời. G-02: chỉ có giờ ở bước Chờ xác nhận (`createdAt`) và Đã hủy (`cancelledAt`). */
export function lifecycleSteps(appointment: Appointment): LifecycleStep[] {
  const order = appointment.type === "Spa" ? SPA_STEPS : HOTEL_STEPS;
  const timeOf = (status: AppointmentStatus) => (status === "Pending" ? formatStepTime(appointment.createdAt) : undefined);

  if (appointment.status === "Cancelled") {
    const reached = (appointment.cancelReason && REACHED_BEFORE_CANCEL[appointment.type][appointment.cancelReason]) ?? "Pending";
    const reachedIndex = Math.max(0, order.indexOf(reached));
    return [
      ...order.slice(0, reachedIndex + 1).map((status) => ({
        label: APPOINTMENT_STATUS_LABELS[status],
        state: "done" as const,
        time: timeOf(status),
      })),
      {
        label: APPOINTMENT_STATUS_LABELS.Cancelled,
        state: "cancel" as const,
        time: appointment.cancelledAt ? formatStepTime(appointment.cancelledAt) : undefined,
      },
    ];
  }

  const currentIndex = order.indexOf(appointment.status);
  return order.map((status, index) => ({
    label: APPOINTMENT_STATUS_LABELS[status],
    state:
      index < currentIndex || appointment.status === "Completed"
        ? ("done" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("todo" as const),
    time: timeOf(status),
  }));
}
