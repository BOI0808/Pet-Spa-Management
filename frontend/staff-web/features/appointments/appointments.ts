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
/** Mốc bắt đầu của lịch: giờ hẹn spa hoặc giờ nhận lưu trú. */
export function appointmentStart(appointment: Appointment) {
  return appointment.slotStart ?? appointment.plannedCheckIn ?? appointment.createdAt;
}

/** Ngày hẹn “YYYY-MM-DD” theo múi giờ cửa hàng. */
export function appointmentDate(appointment: Appointment) {
  return toStoreDate(appointmentStart(appointment));
}

/**
 * Mục Hôm nay (UI-Screens SW-02 vùng 5): backend đã lọc theo ngày và sắp theo giờ (`date`, `sort=time_asc`); web chỉ bỏ
 * lịch Đã hủy vì nhân viên không còn việc với lịch đó (đã có thông báo hủy – SW-13).
 */
export function todayItems(appointments: Appointment[]) {
  return appointments.filter((item) => item.status !== "Cancelled");
}

/**
 * Mục Sắp tới (vùng 6): lịch Đã xác nhận sắp theo giờ; API không lọc “sau hôm nay” nên bỏ lịch của hôm nay
 * (đã ở mục Hôm nay) và lịch ngày cũ chưa bị hủy tự động.
 */
export function upcomingItems(appointments: Appointment[], today: string) {
  return appointments.filter((item) => appointmentDate(item) > today);
}

// ── SW-02 lễ tân ──
const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `?date=` hợp lệ thì dùng, không thì hôm nay (UI-Screens SW-02: mặc định hôm nay). Ngày không tồn tại như 2026-02-30
 * vẫn qua `Date.parse` (tự lùi sang 02/03, review PR #62) nên định dạng lại ngày vừa đọc và so với chuỗi gốc.
 */
export function parseDateParam(value: string | null, today: string) {
  if (!value || !DATE_PARAM.test(value)) return today;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : today;
}

/**
 * Mốc giờ của một dòng trong ngày `date` (UI-Screens SW-02 vùng 3): spa là giờ bắt đầu; lưu trú là giờ nhận nếu nhận
 * trong ngày, không thì giờ trả. Backend sắp lưu trú theo giờ nhận nên lịch “trả” phải sắp lại ở web theo mốc này.
 */
export function rowMoment(appointment: Appointment, date: string): { iso: string; label?: "nhận" | "trả" } {
  if (appointment.type === "Spa") return { iso: appointmentStart(appointment) };
  const { plannedCheckIn, plannedCheckOut, actualCheckOut } = appointment;
  if (plannedCheckIn && toStoreDate(plannedCheckIn) === date) return { iso: plannedCheckIn, label: "nhận" };
  const checkOut = actualCheckOut ?? plannedCheckOut;
  if (checkOut) return { iso: checkOut, label: "trả" };
  return { iso: appointmentStart(appointment) };
}

export function sortByRowMoment(appointments: Appointment[], date: string) {
  return [...appointments].sort(
    (a, b) => Date.parse(rowMoment(a, date).iso) - Date.parse(rowMoment(b, date).iso),
  );
}

/** Chip lọc nhanh của SW-02 vùng 2, lọc ở web trên danh sách trong ngày. */
export const RECEPTION_FILTERS = ["all", "waiting", "inStore", "hotelMoves", "pending"] as const;
export type ReceptionFilter = (typeof RECEPTION_FILTERS)[number];

export const RECEPTION_FILTER_LABELS: Record<ReceptionFilter, string> = {
  all: "Tất cả",
  waiting: "Chờ tiếp nhận",
  inStore: "Đang ở cửa hàng",
  hotelMoves: "Lưu trú nhận, trả",
  pending: "Chờ xác nhận",
};

/**
 * Luật từng chip (UI-Screens SW-02 vùng 2): Chờ tiếp nhận = Đã xác nhận có giờ hẹn hoặc giờ nhận trong ngày; Đang ở
 * cửa hàng = Đã tiếp nhận, Đang thực hiện; Lưu trú nhận, trả = mọi lịch lưu trú trong ngày (backend đã lọc theo ngày
 * nhận hoặc ngày trả); Chờ xác nhận = Chờ xác nhận. Lịch Đang lưu trú không thuộc “Đang ở cửa hàng” vì UI-Screens ghi
 * rõ hai trạng thái của lịch spa.
 */
export function matchesReceptionFilter(appointment: Appointment, filter: ReceptionFilter, date: string) {
  switch (filter) {
    case "all":
      return true;
    case "waiting":
      return appointment.status === "Confirmed" && toStoreDate(appointmentStart(appointment)) === date;
    case "inStore":
      return appointment.status === "Received" || appointment.status === "InProgress";
    case "hotelMoves":
      return appointment.type === "Hotel";
    case "pending":
      return appointment.status === "Pending";
  }
}

/**
 * Lịch Đã xác nhận có ngày hẹn (spa) hoặc ngày nhận (lưu trú) là hôm nay thì mở SW-07 để tiếp nhận; lịch spa ngày khác
 * backend trả 409 nên không mời bấm. Lịch lưu trú: SW-07 làm bước đối chiếu cân nặng (thẻ 126), thu tiền và đưa vào
 * chuồng ở thẻ 127, 128.
 */
export function canCheckIn(appointment: Appointment, today: string) {
  return appointment.status === "Confirmed" && appointmentDate(appointment) === today;
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
/**
 * “Chó Poodle”; giống đã bắt đầu bằng tên loài (“Mèo Ta”) thì không lặp thành “Mèo Mèo Ta” – cùng luật với thẻ khách
 * ở SW-04 (customer-card.tsx).
 */
export function speciesAndBreed(pet: Pet) {
  const species = SPECIES_LABELS[pet.species];
  return pet.breed.toLocaleLowerCase("vi-VN").startsWith(species.toLocaleLowerCase("vi-VN"))
    ? pet.breed
    : `${species} ${pet.breed}`;
}

/** “Chó Poodle, nhóm Nhỏ” – dòng phụ cạnh tên bé trên phiếu (ui-demo SW-02). */
export function describePetKind(pet: Pet) {
  return `${speciesAndBreed(pet)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
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
