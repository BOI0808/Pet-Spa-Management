import type {
  Appointment,
  AppointmentDetail,
  AppointmentStatus,
  StaffMember,
  WorkShift,
} from "@/lib/api/types";
import { formatAppointmentCode, formatWeekdayLong } from "@/lib/format";
import { toStoreDate, toStoreTime } from "@/lib/time";

export const CHART_START_HOUR = 8;
export const CHART_END_HOUR = 21;
export const CLEANING_BUFFER_MINUTES = 15;
export const UNASSIGNED_ROW_ID = "__unassigned__";

const TOTAL_MINUTES = (CHART_END_HOUR - CHART_START_HOUR) * 60; // 780
const START_MINUTE = CHART_START_HOUR * 60; // 480
const END_MINUTE = CHART_END_HOUR * 60; // 1260

export type ChartShift = {
  leftPct: number;
  widthPct: number;
};

export type ChartBlock = {
  appointmentId: string;
  petName: string;
  timeLabel: string;
  status: AppointmentStatus;
  leftPct: number;
  widthPct: number;
  lane: number;
  bufferWidthPct: number;
};

export type ChartRow = {
  id: string;
  label: string;
  laneCount: number;
  shifts: ChartShift[];
  blocks: ChartBlock[];
};

export type AttentionKind = "costConfirmation" | "hotelCheckIn" | "hotelCheckOut";

export type AttentionItem = {
  key: string;
  kind: AttentionKind;
  appointmentId: string;
  title: string;
  description: string;
  time: string;
};

export type BuildChartDataParams = {
  date: string;
  staff: StaffMember[];
  shifts: WorkShift[];
  appointments: Appointment[];
  details: Map<string, AppointmentDetail>;
};

export type BuildAttentionItemsParams = {
  date: string;
  spaAppointments: Appointment[];
  hotelAppointments: Appointment[];
  details: Map<string, AppointmentDetail>;
  unpaidStayAppointmentIds: Set<string>;
};

export type SpaTodaySummary = {
  total: number;
  description: string;
};

/** “2026-10-06” → “Thứ ba 06/10/2026” (dòng phụ của tiêu đề MW-02). */
export function formatDashboardDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${formatWeekdayLong(date)} ${day}/${month}/${year}`;
}

/**
 * Vị trí đường “Hiện tại” (08:00 – 21:00) theo phần trăm chiều rộng (0% – 100%).
 * Trả về `null` nếu thời điểm hiện tại không thuộc ngày `today` hoặc nằm ngoài khung 08:00 – 21:00.
 */
export function getNowPercent(now: number, today: string): number | null {
  const iso = new Date(now).toISOString();
  if (toStoreDate(iso) !== today) return null;
  const timeStr = toStoreTime(iso);
  const [h, m] = timeStr.split(":").map(Number);
  const currentMinute = h * 60 + m;
  if (currentMinute < START_MINUTE || currentMinute > END_MINUTE) return null;
  return ((currentMinute - START_MINUTE) / TOTAL_MINUTES) * 100;
}

/**
 * Tổng số lịch spa hôm nay (không tính Đã hủy) và mô tả theo trạng thái có lịch (ví dụ: "1 đang làm, 2 đã tiếp nhận, 2 chờ đến").
 */
export function summarizeSpaToday(spaItems: Appointment[]): SpaTodaySummary {
  const active = spaItems.filter((item) => item.status !== "Cancelled");
  if (active.length === 0) {
    return { total: 0, description: "" };
  }

  const inProgress = active.filter((item) => item.status === "InProgress").length;
  const received = active.filter((item) => item.status === "Received").length;
  const confirmed = active.filter((item) => item.status === "Confirmed").length;
  const pending = active.filter((item) => item.status === "Pending").length;
  const completed = active.filter((item) => item.status === "Completed").length;

  const parts: string[] = [];
  if (inProgress > 0) parts.push(`${inProgress} đang làm`);
  if (received > 0) parts.push(`${received} đã tiếp nhận`);
  if (confirmed > 0) parts.push(`${confirmed} chờ đến`);
  if (pending > 0) parts.push(`${pending} chờ xác nhận`);
  if (completed > 0) parts.push(`${completed} hoàn tất`);

  return {
    total: active.length,
    description: parts.join(", "),
  };
}

function isoToMinutesOfDay(iso: string): number {
  const timeStr = toStoreTime(iso);
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Xây dựng dữ liệu cho biểu đồ tiến độ spa theo nhân viên (MW-02 vùng 3):
 * - Mỗi nhân viên spa một hàng (nhân viên đang hoạt động xếp trước theo tên; nhân viên vô hiệu hóa có lịch xếp sau).
 * - Lịch Chờ xác nhận vào hàng “Chưa phân công”.
 * - Lịch Hoàn tất hiện theo người đã làm, không có vạch dọn dẹp.
 * - Lịch Đã hủy không vẽ.
 */
export function buildChartData({
  staff,
  shifts,
  appointments,
  details,
}: BuildChartDataParams): { rows: ChartRow[]; missingStaffCount: number } {
  const spaStaff = staff.filter((s) => s.staffRole === "SpaStaff");
  const activeSpaStaff = spaStaff
    .filter((s) => s.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const deactivatedStaffWithAptMap = new Map<string, StaffMember>();
  for (const apt of appointments) {
    if (apt.status === "Cancelled" || apt.status === "Pending") continue;
    const detail = details.get(apt.appointmentId);
    if (!detail?.staff) continue;
    for (const member of detail.staff) {
      if (apt.status === "Completed" || member.isHolding) {
        const found = spaStaff.find((s) => s.staffId === member.staffId && !s.isActive);
        if (found) deactivatedStaffWithAptMap.set(found.staffId, found);
      }
    }
  }

  const deactivatedSpaStaff = Array.from(deactivatedStaffWithAptMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "vi"),
  );

  const rows: ChartRow[] = [];
  for (const member of activeSpaStaff) {
    rows.push({
      id: member.staffId,
      label: member.fullName,
      laneCount: 1,
      shifts: [],
      blocks: [],
    });
  }
  for (const member of deactivatedSpaStaff) {
    rows.push({
      id: member.staffId,
      label: member.fullName,
      laneCount: 1,
      shifts: [],
      blocks: [],
    });
  }

  const hasPending = appointments.some((apt) => apt.status === "Pending");
  if (hasPending) {
    rows.push({
      id: UNASSIGNED_ROW_ID,
      label: "Chưa phân công",
      laneCount: 1,
      shifts: [],
      blocks: [],
    });
  }

  // Dựng ca làm cho từng hàng
  for (const row of rows) {
    if (row.id === UNASSIGNED_ROW_ID) continue;
    const staffShifts = shifts.filter((s) => s.staffId === row.id);
    for (const shift of staffShifts) {
      const startMin = isoToMinutesOfDay(shift.shiftStart);
      const endMin = isoToMinutesOfDay(shift.shiftEnd);
      if (endMin <= START_MINUTE || startMin >= END_MINUTE) continue;
      const clampedStart = Math.max(START_MINUTE, startMin);
      const clampedEnd = Math.min(END_MINUTE, endMin);
      const leftPct = ((clampedStart - START_MINUTE) / TOTAL_MINUTES) * 100;
      const widthPct = ((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100;
      if (widthPct > 0) {
        row.shifts.push({ leftPct, widthPct });
      }
    }
  }

  // Dựng khối lịch hẹn
  let missingStaffCount = 0;
  type RawBlock = ChartBlock & { startMin: number; effectiveEndMin: number };
  const rowBlocksMap = new Map<string, RawBlock[]>();
  rows.forEach((r) => rowBlocksMap.set(r.id, []));

  for (const apt of appointments) {
    if (apt.status === "Cancelled") continue;
    if (!apt.slotStart) continue;

    const startMin = isoToMinutesOfDay(apt.slotStart);
    const endMin = apt.slotEnd ? isoToMinutesOfDay(apt.slotEnd) : startMin + 60;
    if (endMin <= START_MINUTE || startMin >= END_MINUTE) continue;

    const clampedStart = Math.max(START_MINUTE, startMin);
    const clampedEnd = Math.min(END_MINUTE, endMin);
    const leftPct = ((clampedStart - START_MINUTE) / TOTAL_MINUTES) * 100;
    const widthPct = Math.max(0, ((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100);

    let bufferWidthPct = 0;
    let effectiveEndMin = endMin;
    if (apt.status !== "Completed") {
      effectiveEndMin = endMin + CLEANING_BUFFER_MINUTES;
      const bufferStart = endMin;
      const bufferEnd = Math.min(END_MINUTE, endMin + CLEANING_BUFFER_MINUTES);
      if (bufferStart < END_MINUTE && bufferEnd > bufferStart) {
        const clampedBufStart = Math.max(START_MINUTE, bufferStart);
        bufferWidthPct = Math.max(0, ((bufferEnd - clampedBufStart) / TOTAL_MINUTES) * 100);
      }
    }

    const timeLabel = apt.slotEnd
      ? `${toStoreTime(apt.slotStart)} – ${toStoreTime(apt.slotEnd)}`
      : toStoreTime(apt.slotStart);

    const createRawBlock = (): RawBlock => ({
      appointmentId: apt.appointmentId,
      petName: apt.petName ?? "Thú cưng",
      timeLabel,
      status: apt.status,
      leftPct,
      widthPct,
      lane: 0,
      bufferWidthPct,
      startMin,
      effectiveEndMin,
    });

    if (apt.status === "Pending") {
      const list = rowBlocksMap.get(UNASSIGNED_ROW_ID);
      if (list) list.push(createRawBlock());
      continue;
    }

    const detail = details.get(apt.appointmentId);
    if (!detail) {
      missingStaffCount++;
      continue;
    }

    const assignedStaff = (detail.staff ?? []).filter(
      (member) => apt.status === "Completed" || member.isHolding,
    );

    if (assignedStaff.length === 0) {
      missingStaffCount++;
      continue;
    }

    let placed = false;
    for (const staffMember of assignedStaff) {
      const list = rowBlocksMap.get(staffMember.staffId);
      if (list) {
        list.push(createRawBlock());
        placed = true;
      }
    }
    if (!placed) {
      missingStaffCount++;
    }
  }

  // Phân chia lane cho các khối bị chồng giờ trong cùng hàng
  for (const row of rows) {
    const rawBlocks = rowBlocksMap.get(row.id) ?? [];
    rawBlocks.sort((a, b) => a.startMin - b.startMin || a.effectiveEndMin - b.effectiveEndMin);

    const laneEndMinutes: number[] = [];
    const placedBlocks: ChartBlock[] = [];

    for (const block of rawBlocks) {
      let assignedLane = -1;
      for (let i = 0; i < laneEndMinutes.length; i++) {
        if (laneEndMinutes[i] <= block.startMin) {
          assignedLane = i;
          laneEndMinutes[i] = block.effectiveEndMin;
          break;
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEndMinutes.length;
        laneEndMinutes.push(block.effectiveEndMin);
      }

      placedBlocks.push({
        appointmentId: block.appointmentId,
        petName: block.petName,
        timeLabel: block.timeLabel,
        status: block.status,
        leftPct: block.leftPct,
        widthPct: block.widthPct,
        lane: assignedLane,
        bufferWidthPct: block.bufferWidthPct,
      });
    }

    row.blocks = placedBlocks;
    row.laneCount = Math.max(1, laneEndMinutes.length);
  }

  return {
    rows,
    missingStaffCount,
  };
}

/**
 * MW-02 vùng 4 – Danh sách việc “Cần chú ý”:
 * - Lịch spa đang chờ khách xác nhận chi phí.
 * - Lịch lưu trú nhận trong ngày (chưa thu tiền hoặc đã thu).
 * - Lịch lưu trú trả trong ngày.
 */
export function buildAttentionItems({
  date,
  spaAppointments,
  hotelAppointments,
  details,
  unpaidStayAppointmentIds,
}: BuildAttentionItemsParams): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Lịch spa chờ khách xác nhận chi phí
  for (const apt of spaAppointments) {
    if (apt.status === "Cancelled") continue;
    const detail = details.get(apt.appointmentId);
    const conf = detail?.pendingCostConfirmation;
    if (conf?.expiresAt) {
      items.push({
        key: `cost-${apt.appointmentId}`,
        kind: "costConfirmation",
        appointmentId: apt.appointmentId,
        title: `${apt.petName ?? "Thú cưng"} chờ khách xác nhận chi phí`,
        description: `${formatAppointmentCode(apt.appointmentId)}. Hết hạn lúc ${toStoreTime(conf.expiresAt)}, sau đó tự động hủy.`,
        time: conf.expiresAt,
      });
    }
  }

  // Lịch lưu trú nhận trong ngày
  for (const apt of hotelAppointments) {
    if (apt.status === "Cancelled") continue;
    if (
      apt.status === "Confirmed" &&
      apt.plannedCheckIn &&
      toStoreDate(apt.plannedCheckIn) === date
    ) {
      const isUnpaid = unpaidStayAppointmentIds.has(apt.appointmentId);
      items.push({
        key: `checkin-${apt.appointmentId}`,
        kind: "hotelCheckIn",
        appointmentId: apt.appointmentId,
        title: `${apt.petName ?? "Thú cưng"} nhận lúc ${toStoreTime(apt.plannedCheckIn)}`,
        description: isUnpaid
          ? `${formatAppointmentCode(apt.appointmentId)}. Chưa thu tiền lưu trú.`
          : `${formatAppointmentCode(apt.appointmentId)}.`,
        time: apt.plannedCheckIn,
      });
    }

    // Lịch lưu trú trả trong ngày
    if (
      apt.status === "InStay" &&
      apt.plannedCheckOut &&
      toStoreDate(apt.plannedCheckOut) === date
    ) {
      items.push({
        key: `checkout-${apt.appointmentId}`,
        kind: "hotelCheckOut",
        appointmentId: apt.appointmentId,
        title: `${apt.petName ?? "Thú cưng"} trả lúc ${toStoreTime(apt.plannedCheckOut)}`,
        description: `${formatAppointmentCode(apt.appointmentId)}.`,
        time: apt.plannedCheckOut,
      });
    }
  }

  items.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return items;
}
