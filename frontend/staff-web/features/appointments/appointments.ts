// Luật hiển thị dùng chung của SW-02, SW-03 (UI-Screens.md). Không gọi API ở đây.
// Phần lớn chép từ customer-web (features/appointments/appointments.ts) và giữ cùng tên hàm.
import type { LifecycleStep } from "@/components/domain/lifecycle";
import type {
  Appointment,
  AppointmentDetail,
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  Payment,
  Pet,
  Service,
  SizeGroup,
  Species,
} from "@/lib/api/types";
import { formatDate, formatDayMonth, formatFullDate, formatWeekdayShort } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { countNights, toStoreDate, toStoreTime } from "@/lib/time";

// ── SW-02 nhân viên spa ──
/**
 * Trạng thái của lịch còn việc với nhân viên spa: chờ tiếp nhận, đã tiếp nhận, đang làm. Hoàn tất, đã hủy là lịch sử
 * (SW-12, thẻ 132); lịch Chờ xác nhận chưa có nhân viên nên không bao giờ thuộc danh sách này.
 */
export const ASSIGNED_STATUSES: readonly AppointmentStatus[] = ["Confirmed", "Received", "InProgress"];

/** Mốc bắt đầu của lịch: giờ hẹn spa hoặc giờ nhận lưu trú. */
export function appointmentStart(appointment: Appointment) {
  return appointment.slotStart ?? appointment.plannedCheckIn ?? appointment.createdAt;
}

/** Ngày hẹn “YYYY-MM-DD” theo múi giờ cửa hàng. */
export function appointmentDate(appointment: Appointment) {
  return toStoreDate(appointmentStart(appointment));
}

/** Backend sắp theo thời điểm tạo (G-06): sắp lại ở web theo giờ hẹn, sớm trước. */
export function sortByStart(appointments: Appointment[]) {
  return [...appointments].sort((a, b) => Date.parse(appointmentStart(a)) - Date.parse(appointmentStart(b)));
}

/**
 * Chia lịch được phân công thành Hôm nay và Sắp tới (UI-Screens SW-02 vùng 5, 6). Sắp tới chỉ gồm lịch Đã xác nhận
 * như UI-Screens ghi; lịch đã tiếp nhận hoặc đang làm từ hôm trước (hiếm) vẫn hiện ở Hôm nay để không bị mất.
 */
export function splitAssigned(appointments: Appointment[], today: string) {
  const sorted = sortByStart(appointments.filter((item) => item.type === "Spa"));
  return {
    today: sorted.filter((item) => {
      const date = appointmentDate(item);
      return date === today || (date < today && item.status !== "Confirmed");
    }),
    upcoming: sorted.filter((item) => item.status === "Confirmed" && appointmentDate(item) > today),
  };
}

/** “09:00 – 11:00”. */
export function formatSlotRange(appointment: Appointment) {
  if (!appointment.slotStart) return "";
  const start = toStoreTime(appointment.slotStart);
  return appointment.slotEnd ? `${start} – ${toStoreTime(appointment.slotEnd)}` : start;
}

/** Cuống phiếu: hôm nay “09:00” + “đến 11:00”; ngày sau “09:00” + “T4 07/10” (ui-demo SW-02). */
export function ticketStub(appointment: Appointment, today: string) {
  const start = appointmentStart(appointment);
  const date = toStoreDate(start);
  let dateText = `${formatWeekdayShort(date)} ${formatDayMonth(date)}`;
  if (date === today && appointment.slotEnd) dateText = `đến ${toStoreTime(appointment.slotEnd)}`;
  return { tone: "spa", time: toStoreTime(start), date: dateText } as const;
}

/** “Thứ ba 06/10/2026”. */
export function formatLongDate(isoDateTime: string) {
  return formatFullDate(toStoreDate(isoDateTime));
}

/** “11:20, 06/10/2026”. */
export function formatDateTime(isoDateTime: string) {
  return `${toStoreTime(isoDateTime)}, ${formatDate(toStoreDate(isoDateTime))}`;
}

/** “03/10, 20:14” – mốc dưới từng bước vòng đời. */
function formatStepTime(isoDateTime: string) {
  return `${formatDayMonth(toStoreDate(isoDateTime))}, ${toStoreTime(isoDateTime)}`;
}

/** Số đêm theo ngày nhận và ngày trả dự kiến. */
export function nightsOf(appointment: Appointment) {
  if (!appointment.plannedCheckIn || !appointment.plannedCheckOut) return null;
  return countNights(appointment.plannedCheckIn, appointment.plannedCheckOut);
}

// ── Thú cưng, dịch vụ, nhân viên ──
/** “Chó Poodle, nhóm Nhỏ” – dòng phụ cạnh tên bé trên phiếu (ui-demo SW-02). */
export function describePetKind(pet: Pet) {
  return `${SPECIES_LABELS[pet.species]} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
}

export function serviceNames(detail: AppointmentDetail) {
  return (detail.services ?? []).map((service) => service.name).filter((name): name is string => Boolean(name));
}

export function staffNames(detail: AppointmentDetail) {
  return (detail.staff ?? []).map((member) => member.fullName).filter((name): name is string => Boolean(name));
}

/** Giá, thời lượng một dịch vụ theo loài + nhóm kích cỡ của lịch (G-05: chi tiết lịch không có giá). */
export function findPricing(services: Service[] | undefined, serviceId: string, species: Species, sizeGroup: SizeGroup) {
  return services
    ?.find((service) => service.serviceId === serviceId)
    ?.pricing.find((row) => row.species === species && row.sizeGroup === sizeGroup);
}

export function findPayment(payments: Payment[] | undefined, kind: Payment["kind"]) {
  return payments?.find((payment) => payment.kind === kind);
}

// ── Vòng đời (SW-03 vùng 2, như CW-09 vùng 2) ──
const SPA_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "Received", "InProgress", "Completed"];
const HOTEL_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "InStay", "Completed"];

// Không lưu lịch sử trạng thái (G-02) nên bước đã đạt trước khi hủy suy ra từ lý do hủy (giống customer-web).
const REACHED_BEFORE_CANCEL: Record<AppointmentType, Partial<Record<CancelReason, AppointmentStatus>>> = {
  Spa: { NoShow: "Confirmed", CostNotConfirmed: "Received" },
  Hotel: { NoShow: "Confirmed", CostNotConfirmed: "Confirmed" },
};

export function lifecycleSteps(appointment: Appointment): LifecycleStep[] {
  const order = appointment.type === "Spa" ? SPA_STEPS : HOTEL_STEPS;
  // G-02: chỉ có giờ ở bước Chờ xác nhận (`createdAt`) và Đã hủy (`cancelledAt`).
  const timeOf = (status: AppointmentStatus) =>
    status === "Pending" ? formatStepTime(appointment.createdAt) : undefined;

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
