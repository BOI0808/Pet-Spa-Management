import type { Cage } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { toStoreDate, toStoreTime } from "@/lib/time";

/** Tình trạng một chuồng ở MW-07: có thú cưng đang lưu trú thì “Đang chứa”, còn lại theo `isActive`. */
export type CageStatusKind = "free" | "occupied" | "inactive";

export function getCageStatus(cage: Cage): CageStatusKind {
  if (cage.occupant) return "occupied";
  return cage.isActive ? "free" : "inactive";
}

export type CageSummary = {
  /** Sức chứa lưu trú: số chuồng đang sử dụng (UI-Screens MW-07). */
  capacity: number;
  /** Số chuồng đang có thú cưng lưu trú. */
  occupied: number;
  /** Chuồng đang sử dụng và chưa có thú cưng: sẵn sàng nhận. */
  free: number;
  /** Chuồng đã ngừng sử dụng và đang trống, không tính vào sức chứa. */
  inactive: number;
  /** Mã các chuồng đang chứa, theo thứ tự backend trả (sắp theo mã). */
  occupiedCodes: string[];
};

/** Số liệu 4 thẻ của MW-07 vùng 3 và thẻ “Chuồng đang chứa” của MW-02, tính từ trang chuồng đã tải. */
export function summarizeCages(cages: Cage[]): CageSummary {
  const occupiedCages = cages.filter((cage) => getCageStatus(cage) === "occupied");
  return {
    capacity: cages.filter((cage) => cage.isActive).length,
    occupied: occupiedCages.length,
    free: cages.filter((cage) => getCageStatus(cage) === "free").length,
    inactive: cages.filter((cage) => getCageStatus(cage) === "inactive").length,
    occupiedCodes: occupiedCages.map((cage) => cage.code),
  };
}

/**
 * Giờ trả dự kiến của thú cưng đang chứa: “Trả 18:00 hôm nay” hoặc “Trả 17:00 07/10” (`dayPrefix` “ngày ” cho MW-02: “Trả 17:00 ngày 07/10”).
 * `today` là ngày “YYYY-MM-DD” theo múi giờ cửa hàng.
 */
export function formatOccupantCheckOut(plannedCheckOut: string, today: string, dayPrefix = "") {
  const date = toStoreDate(plannedCheckOut);
  return `Trả ${toStoreTime(plannedCheckOut)} ${date === today ? "hôm nay" : `${dayPrefix}${formatDayMonth(date)}`}`;
}
