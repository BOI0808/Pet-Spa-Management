// Luật hiển thị dùng chung của CW-08, CW-09, CW-11 (UI-Screens.md). Không gọi API ở đây.
import type { LifecycleStep } from "@/components/domain/lifecycle";
import type {
  Appointment,
  AppointmentDetail,
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  Payment,
  PaymentMethod,
  Pet,
  Service,
  SizeGroup,
  Species,
} from "@/lib/api/types";
import { formatDate, formatDayMonth, formatMoney, formatWeekday, formatWeekdayShort } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, CANCEL_REASON_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDays, countNights, toStoreDate, toStoreTime } from "@/lib/time";

// ── Tab và bộ lọc của CW-08 (đồng bộ với `?tab=`, `?type=`, `?page=`) ──
export const APPOINTMENT_TABS = ["upcoming", "completed", "cancelled"] as const;
export type AppointmentTab = (typeof APPOINTMENT_TABS)[number];

export const APPOINTMENT_TAB_LABELS: Record<AppointmentTab, string> = {
  upcoming: "Đang diễn ra và sắp tới",
  completed: "Đã hoàn tất",
  cancelled: "Đã hủy",
};

/** Tab 1 gồm các trạng thái chưa kết thúc (UI-Screens CW-08 vùng 2). */
export const ONGOING_STATUSES: readonly AppointmentStatus[] = ["Pending", "Confirmed", "Received", "InProgress", "InStay"];

export function parseTab(value: string | null): AppointmentTab {
  return APPOINTMENT_TABS.find((tab) => tab === value) ?? "upcoming";
}

export function parseType(value: string | null): AppointmentType | undefined {
  return value === "Spa" || value === "Hotel" ? value : undefined;
}

export function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

// ── Thời gian ──
/** Mốc bắt đầu của lịch: giờ hẹn spa hoặc giờ nhận lưu trú. */
export function appointmentStart(appointment: Appointment) {
  return appointment.slotStart ?? appointment.plannedCheckIn ?? appointment.createdAt;
}

/** Backend chưa quy định thứ tự (G-06): sắp xếp ở web theo thời gian hẹn. */
export function sortByStart(appointments: Appointment[], direction: "asc" | "desc") {
  const sign = direction === "asc" ? 1 : -1;
  return [...appointments].sort(
    (a, b) => sign * (Date.parse(appointmentStart(a)) - Date.parse(appointmentStart(b))),
  );
}

/** “09:00 – 11:00”. */
export function formatSlotRange(appointment: Appointment) {
  if (!appointment.slotStart) return "";
  const start = toStoreTime(appointment.slotStart);
  return appointment.slotEnd ? `${start} – ${toStoreTime(appointment.slotEnd)}` : start;
}

/** “Thứ ba 06/10/2026”. */
export function formatLongDate(isoDateTime: string) {
  const date = toStoreDate(isoDateTime);
  const weekday = formatWeekday(date);
  return `${weekday.charAt(0).toLocaleUpperCase("vi-VN")}${weekday.slice(1)} ${formatDate(date)}`;
}

/** “21:40 ngày 19/09/2026”. */
export function formatTimeOnDate(isoDateTime: string) {
  return `${toStoreTime(isoDateTime)} ngày ${formatDate(toStoreDate(isoDateTime))}`;
}

/** “11:20, 06/10/2026”. */
export function formatDateTime(isoDateTime: string) {
  return `${toStoreTime(isoDateTime)}, ${formatDate(toStoreDate(isoDateTime))}`;
}

/** “18/08 08:30”. */
export function formatDayMonthTime(isoDateTime: string) {
  return `${formatDayMonth(toStoreDate(isoDateTime))} ${toStoreTime(isoDateTime)}`;
}

/** “03/10, 20:14” – mốc dưới từng bước vòng đời. */
function formatStepTime(isoDateTime: string) {
  return `${formatDayMonth(toStoreDate(isoDateTime))}, ${toStoreTime(isoDateTime)}`;
}

/** Số đêm theo ngày nhận và ngày trả dự kiến (UI-Screens CW-07 vùng 3). */
export function nightsOf(appointment: Appointment) {
  if (!appointment.plannedCheckIn || !appointment.plannedCheckOut) return null;
  return countNights(appointment.plannedCheckIn, appointment.plannedCheckOut);
}

/** “2 đêm: nhận 08:00 thứ sáu, trả 17:00 chủ nhật.” */
export function describeStay(appointment: Appointment) {
  const { plannedCheckIn, plannedCheckOut } = appointment;
  if (!plannedCheckIn || !plannedCheckOut) return "";
  const nights = countNights(plannedCheckIn, plannedCheckOut);
  const checkIn = `${toStoreTime(plannedCheckIn)} ${formatWeekday(toStoreDate(plannedCheckIn))}`;
  const checkOut = `${toStoreTime(plannedCheckOut)} ${formatWeekday(toStoreDate(plannedCheckOut))}`;
  return `${nights} đêm: nhận ${checkIn}, trả ${checkOut}.`;
}

/** Cuống phiếu hẹn: spa “09:00” + “Hôm nay, 06/10”; lưu trú “09/10” + “đến 11/10” (UI-Screens CW-08 vùng 4). */
export function ticketStub(appointment: Appointment, tab: AppointmentTab, today: string) {
  const tone = appointment.status === "Cancelled" ? "cancel" : appointment.type === "Hotel" ? "hotel" : "spa";
  if (appointment.type === "Hotel" && appointment.plannedCheckIn && appointment.plannedCheckOut) {
    return {
      tone,
      time: formatDayMonth(toStoreDate(appointment.plannedCheckIn)),
      date: `đến ${formatDayMonth(toStoreDate(appointment.plannedCheckOut))}`,
    } as const;
  }
  const start = appointmentStart(appointment);
  const date = toStoreDate(start);
  let dateText = formatDate(date);
  // Lịch sắp tới: ngày rút gọn kèm thứ (UI-Screens 2.5); “Ngày mai” là đề xuất.
  if (tab === "upcoming") {
    if (date === today) dateText = `Hôm nay, ${formatDayMonth(date)}`;
    else if (date === addDays(today, 1)) dateText = `Ngày mai, ${formatDayMonth(date)}`;
    else dateText = `${formatWeekdayShort(date)} ${formatDayMonth(date)}`;
  }
  return { tone, time: toStoreTime(start), date: dateText } as const;
}

// ── Thú cưng, dịch vụ, nhân viên ──
/** “Bông và Mochi”, “Bông, Mochi và Na”. */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

/** “Bông, chó Poodle”. */
export function describePet(pet: Pet) {
  return `${pet.name}, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} ${pet.breed}`;
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

export function cancelReasonText(reason: CancelReason | null | undefined) {
  return reason ? CANCEL_REASON_LABELS[reason] : "không rõ";
}

// ── Thanh toán ──
// Ghép sau số tiền: “Đã thanh toán 210.000đ, tiền mặt tại quầy.” (ui-demo CW-11).
const PAYMENT_METHOD_SENTENCE: Record<PaymentMethod, string> = {
  Cash: "tiền mặt tại quầy",
  BankQR: "chuyển khoản QR",
  Online: "trực tuyến",
};

export function paymentMethodText(method: PaymentMethod | null | undefined) {
  return method ? PAYMENT_METHOD_SENTENCE[method] : "";
}

export function findPayment(payments: Payment[] | undefined, kind: Payment["kind"]) {
  return payments?.find((payment) => payment.kind === kind);
}

/** “Đã thanh toán 210.000đ, tiền mặt tại quầy.” / “Chưa thanh toán 210.000đ.” */
export function describePayment(payment: Payment) {
  if (payment.status === "Unpaid") return `Chưa thanh toán ${formatMoney(payment.amount)}.`;
  const method = paymentMethodText(payment.method);
  return `Đã thanh toán ${formatMoney(payment.amount)}${method ? `, ${method}` : ""}.`;
}

// ── Vòng đời (CW-09 vùng 2) ──
const SPA_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "Received", "InProgress", "Completed"];
const HOTEL_STEPS: readonly AppointmentStatus[] = ["Pending", "Confirmed", "InStay", "Completed"];

// Không lưu lịch sử trạng thái (G-02) nên bước đã đạt trước khi hủy suy ra từ lý do hủy:
// vắng mặt chỉ xảy ra với lịch đã xác nhận; không xác nhận chi phí chỉ xảy ra sau khi tiếp nhận.
// Lý do khác không biết chắc nên chỉ hiện bước Chờ xác nhận.
const REACHED_BEFORE_CANCEL: Partial<Record<CancelReason, AppointmentStatus>> = {
  NoShow: "Confirmed",
  CostNotConfirmed: "Received",
};

export function lifecycleSteps(appointment: Appointment): LifecycleStep[] {
  const order = appointment.type === "Spa" ? SPA_STEPS : HOTEL_STEPS;
  // G-02: chỉ có giờ ở bước Chờ xác nhận (`createdAt`) và Đã hủy (`cancelledAt`).
  const timeOf = (status: AppointmentStatus) =>
    status === "Pending" ? formatStepTime(appointment.createdAt) : undefined;

  if (appointment.status === "Cancelled") {
    const reached = (appointment.cancelReason && REACHED_BEFORE_CANCEL[appointment.cancelReason]) ?? "Pending";
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
