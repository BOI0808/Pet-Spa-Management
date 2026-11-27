// Luật hiển thị của SW-08 Tình trạng chuồng (UI-Screens.md, FR-HTL-08, BR-21). Không gọi API ở đây.
import type { Appointment, Cage, SizeGroup, Species } from "@/lib/api/types";
import { isCheckOutDue } from "@/features/appointments/appointments";
import { formatDate, formatDayMonth } from "@/lib/format";
import { toStoreDate, toStoreTime } from "@/lib/time";

/** Trạng thái thẻ chuồng: đang chứa bé, trống, hoặc ngừng sử dụng (không tính vào sức chứa). */
export type CageState = "busy" | "free" | "off";

/**
 * Chuồng có bé thì luôn là “Đang chứa”, kể cả khi quản lý vừa ngừng sử dụng chuồng đó: lễ tân vẫn phải biết bé ở đâu
 * để trả. Chuồng trống mới xét `isActive`.
 */
export function cageState(cage: Cage): CageState {
  if (cage.occupant) return "busy";
  return cage.isActive ? "free" : "off";
}

/** Số chuồng cho dòng mô tả dưới tiêu đề (vùng 1); “đang sử dụng” = đang chứa + trống. */
export function countCages(cages: Cage[]) {
  const counts = { busy: 0, free: 0, off: 0 };
  for (const cage of cages) counts[cageState(cage)] += 1;
  return { ...counts, inUse: counts.busy + counts.free };
}

/**
 * “18:00, 06/10” – giờ nhận, trả của lịch lưu trú (ui-demo SW-08, SW-10). Khác năm của `today` thì thêm năm
 * (“11:32, 02/03/2027”) để lịch đặt xa không bị đọc nhầm sang năm nay.
 */
export function formatStayMoment(isoDateTime: string, today: string) {
  const date = toStoreDate(isoDateTime);
  const day = date.slice(0, 4) === today.slice(0, 4) ? formatDayMonth(date) : formatDate(date);
  return `${toStoreTime(isoDateTime)}, ${day}`;
}

/** Bộ lọc vùng 2, lọc ở web vì GET /cages không có tham số lọc. `null` = không lọc. */
export type CageFilters = {
  species: Species | null;
  sizeGroup: SizeGroup | null;
  /** “Trống” / “Đang chứa”; chuồng ngừng sử dụng chỉ hiện khi xem Tất cả. */
  state: "free" | "busy" | null;
};

export const NO_CAGE_FILTERS: CageFilters = { species: null, sizeGroup: null, state: null };

export function filterCages(cages: Cage[], filters: CageFilters) {
  return cages.filter(
    (cage) =>
      (filters.species === null || cage.species === filters.species) &&
      (filters.sizeGroup === null || cage.sizeGroup === filters.sizeGroup) &&
      (filters.state === null || cageState(cage) === filters.state),
  );
}

/** Sắp theo mã “A1, A2, …, A10” (so số trong mã theo giá trị, không theo từng ký tự). */
export function sortByCode(cages: Cage[]) {
  return [...cages].sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }));
}

/** Chuồng có bé đến lúc trả (vùng 4), cùng luật với SW-02 (`isCheckOutDue`). */
export function isDueForCheckOut(cage: Cage, today: string) {
  return cage.occupant ? isCheckOutDue(cage.occupant.plannedCheckOut, today) : false;
}

/**
 * Lịch Đang lưu trú của bé trong chuồng (G-17: `occupant` không có `appointmentId`). Tìm theo `cageId` của lịch thay vì
 * `petId` như UI-Screens gợi ý: dữ liệu thử đã có một bé Đang lưu trú ở hai chuồng cùng lúc, tìm theo bé sẽ mở nhầm
 * lịch. Mỗi chuồng chỉ chứa một bé tại một thời điểm (BR-21) nên `cageId` không nhập nhằng.
 */
export function findStayAppointment(stays: Appointment[] | undefined, cageId: string) {
  return stays?.find((stay) => stay.cageId === cageId && stay.status === "InStay");
}

/**
 * Mọi lịch lưu trú Đang lưu trú (SW-08 tìm lịch của chuồng, SW-10 danh sách để chọn). Không lọc `date`: `date` chỉ lấy
 * lịch có ngày nhận hoặc ngày trả trong ngày đó, nên bé đón trễ qua ngày sẽ bị sót. Số bé đang ở cùng lúc không quá số
 * chuồng nên một trang 100 là đủ.
 */
export const IN_STAY_PARAMS = { type: "Hotel", status: "InStay", page: 1, pageSize: 100 } as const;
