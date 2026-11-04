import type { PricingRow, Service, ServiceRequest, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { MAX_MONEY_AMOUNT, toWholeNumber } from "@/lib/number-input";
import { SIZE_GROUPS_BY_SPECIES, createPricingGrid } from "@/lib/size-groups";

// MW-06·D1 Thêm / sửa dịch vụ – UI-Screens.md (FR-SVC-01, FR-SVC-02; BR-11, BR-12, BR-19)

/**
 * Các mốc giờ để chọn “Mốc bắt đầu muộn nhất”: mặc định của `Booking.SlotTimes` (SA 7.2).
 * Tạm khai báo ở web vì `GET /config` chưa có trên backend (chưa thẻ nào làm API cấu hình, MW-13);
 * backend vẫn kiểm tra mốc thuộc cấu hình thật và trả 400 nếu sai. Khi có `GET /config` thì đọc từ `settings["Booking.SlotTimes"]`.
 */
export const SLOT_TIME_OPTIONS: readonly string[] = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

/** Giá, thời lượng, số nhân viên của một ô trong bảng; giữ dạng chuỗi như người dùng nhập. */
type PricingCellValues = { price: string; durationMinutes: string; staffRequired: "1" | "2" };

export type ServiceFormValues = {
  name: string;
  description: string;
  /** Rỗng khi chưa chọn. */
  latestStartTime: string;
  /** Các loài đã chọn. */
  species: Species[];
  /** Có đủ ô cho mọi loài và nhóm; chỉ các ô của loài đã chọn được kiểm tra và gửi đi. */
  pricing: Record<Species, Record<SizeGroup, PricingCellValues>>;
};

function emptyCell(): PricingCellValues {
  return { price: "", durationMinutes: "", staffRequired: "1" };
}

/** Giá trị ban đầu của form: dịch vụ đang sửa, hoặc form trống khi thêm mới. */
export function toServiceFormValues(service: Service | null): ServiceFormValues {
  const pricing = createPricingGrid(emptyCell);
  for (const row of service?.pricing ?? []) {
    pricing[row.species][row.sizeGroup] = {
      price: String(row.price),
      durationMinutes: String(row.durationMinutes),
      staffRequired: row.staffRequired === 2 ? "2" : "1",
    };
  }

  const speciesInService = new Set(service?.pricing.map((row) => row.species));
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    latestStartTime: service?.latestStartTime ?? "",
    species: SPECIES_ORDER.filter((species) => speciesInService.has(species)),
    pricing,
  };
}

/**
 * Lỗi đầu tiên trong bảng giá của các loài đã chọn, hoặc null nếu hợp lệ (SA 6.6: giá ≥ 0, thời lượng > 0, đủ mọi nhóm).
 * Số nhân viên là ô chọn 1 hoặc 2 nên không thể sai.
 */
export function findPricingIssue({ species, pricing }: Pick<ServiceFormValues, "species" | "pricing">) {
  for (const selected of SPECIES_ORDER.filter((item) => species.includes(item))) {
    for (const sizeGroup of SIZE_GROUPS_BY_SPECIES[selected]) {
      const cell = pricing[selected][sizeGroup];
      const target = `nhóm ${SIZE_GROUP_LABELS[sizeGroup]} của ${SPECIES_LABELS[selected]}`;
      const price = toWholeNumber(cell.price);
      const duration = toWholeNumber(cell.durationMinutes);

      if (Number.isNaN(price) || Number.isNaN(duration)) return `Thiếu giá/thời lượng cho ${target}.`;
      if (price > MAX_MONEY_AMOUNT) return `Giá dịch vụ tối đa 999.999.999.999đ (${target}).`;
      if (duration < 1) return `Thời lượng dự kiến phải lớn hơn 0 phút (${target}).`;
    }
  }
  return null;
}

/**
 * Chuyển form → body POST/PUT /services. Chỉ gửi các ô của loài đã chọn; gọi sau khi `findPricingIssue` trả null.
 * Mô tả rỗng thì bỏ trường (Frontend-Conventions 4.1).
 */
export function toServiceRequest(values: ServiceFormValues): ServiceRequest {
  const description = values.description.trim();
  const pricing: PricingRow[] = SPECIES_ORDER.filter((species) => values.species.includes(species)).flatMap((species) =>
    SIZE_GROUPS_BY_SPECIES[species].map((sizeGroup) => {
      const cell = values.pricing[species][sizeGroup];
      return {
        species,
        sizeGroup,
        price: toWholeNumber(cell.price),
        durationMinutes: toWholeNumber(cell.durationMinutes),
        staffRequired: cell.staffRequired === "2" ? 2 : 1,
      };
    }),
  );

  return {
    name: values.name.trim(),
    ...(description ? { description } : {}),
    latestStartTime: values.latestStartTime,
    pricing,
  };
}

export function validateServiceName(value: string) {
  const name = value.trim();
  if (!name) return "Vui lòng nhập tên dịch vụ.";
  if (name.length > 150) return "Tên dịch vụ tối đa 150 ký tự.";
  return true;
}

export function validateLatestStartTime(value: string) {
  return SLOT_TIME_OPTIONS.includes(value) || "Vui lòng chọn mốc giờ hợp lệ.";
}

export function validateSelectedSpecies(value: Species[]) {
  return value.length > 0 || "Vui lòng chọn ít nhất một loài áp dụng.";
}
