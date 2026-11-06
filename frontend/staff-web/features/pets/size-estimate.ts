import type { SizeGroup, Species } from "@/lib/api/types";
import { formatDecimal } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

// Nhóm kích cỡ dự kiến ở CW-05 (vùng 7): web chỉ tính để khách xem trước. Nhóm chính thức là `sizeGroup`
// backend trả về khi lưu (FR-PET-04), theo bảng SizeRule mà quản lý có thể đổi ở MW-13; khách không đọc
// được bảng đó nên web dùng giá trị mặc định của bảng mốc BR-19.

type Threshold = {
  unit: "kg" | "cm";
  /** Nhỏ: dưới mốc này. */
  smallUpper: number;
  /** Vừa: từ smallUpper đến dưới mốc này; null khi loài không có nhóm Vừa (chuột lang). */
  mediumUpper: number | null;
};

const WEIGHT_THRESHOLDS: Record<Species, Threshold> = {
  Dog: { unit: "kg", smallUpper: 10, mediumUpper: 25 },
  Cat: { unit: "kg", smallUpper: 3, mediumUpper: 5 },
  Rabbit: { unit: "kg", smallUpper: 1.5, mediumUpper: 3 },
  GuineaPig: { unit: "kg", smallUpper: 1, mediumUpper: null },
};

const DOG_HEIGHT_THRESHOLD: Threshold = { unit: "cm", smallUpper: 35, mediumUpper: 55 };

const GROUP_ORDER: Record<SizeGroup, number> = { Small: 0, Medium: 1, Large: 2 };

/** Cùng cách so mốc với Pet.Classify ở backend. */
function classify(value: number, threshold: Threshold): SizeGroup {
  if (value < threshold.smallUpper) return "Small";
  if (threshold.mediumUpper === null || value >= threshold.mediumUpper) return "Large";
  return "Medium";
}

/** “Vừa (10 – dưới 25 kg)”, “Nhỏ (dưới 35 cm)”, “Lớn (từ 1 kg)”. */
function describe(group: SizeGroup, { unit, smallUpper, mediumUpper }: Threshold) {
  const small = formatDecimal(smallUpper);
  const range =
    group === "Small"
      ? `dưới ${small} ${unit}`
      : group === "Medium"
        ? `${small} – dưới ${formatDecimal(mediumUpper ?? smallUpper)} ${unit}`
        : `từ ${formatDecimal(mediumUpper ?? smallUpper)} ${unit}`;
  return `${SIZE_GROUP_LABELS[group]} (${range})`;
}

export type SizeCriterionResult = { value: number; unit: "kg" | "cm"; group: SizeGroup; description: string };

export type SizeEstimate = {
  byWeight: SizeCriterionResult;
  /** Chỉ có với chó. */
  byHeight: SizeCriterionResult | null;
  group: SizeGroup;
};

function measure(value: number, threshold: Threshold): SizeCriterionResult {
  const group = classify(value, threshold);
  return { value, unit: threshold.unit, group, description: describe(group, threshold) };
}

/** Thiếu loài, cân nặng (hoặc chiều cao với chó), hay số không hợp lệ → null (“Chưa đủ dữ liệu”). */
export function estimateSizeGroup(
  species: Species | "",
  weightKg: number | null,
  heightCm: number | null,
): SizeEstimate | null {
  if (species === "" || weightKg === null || weightKg <= 0) return null;

  const byWeight = measure(weightKg, WEIGHT_THRESHOLDS[species]);
  if (species !== "Dog") return { byWeight, byHeight: null, group: byWeight.group };

  if (heightCm === null || heightCm <= 0) return null;
  const byHeight = measure(heightCm, DOG_HEIGHT_THRESHOLD);
  // Chó: lấy nhóm cao hơn giữa cân nặng và chiều cao (BR-19).
  const group = GROUP_ORDER[byHeight.group] > GROUP_ORDER[byWeight.group] ? byHeight.group : byWeight.group;
  return { byWeight, byHeight, group };
}
