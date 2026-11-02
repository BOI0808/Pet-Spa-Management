import type { HotelPricing, HotelPricingRow, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";

// MW-07 Chuồng và giá lưu trú – UI-Screens.md (FR-HTL-01 → 03; BR-19, BR-21, BR-22)

/**
 * Các nhóm kích cỡ của từng loài (BR-19): chuột lang chỉ có Nhỏ và Lớn.
 * Chép từ `features/services/forms.ts` vì không import chéo giữa các feature (Frontend-Architecture 3.2).
 */
export const SIZE_GROUPS_BY_SPECIES: Record<Species, readonly SizeGroup[]> = {
  Dog: ["Small", "Medium", "Large"],
  Cat: ["Small", "Medium", "Large"],
  Rabbit: ["Small", "Medium", "Large"],
  GuineaPig: ["Small", "Large"],
};

// Số nguyên không âm, có thể ngăn hàng nghìn bằng dấu chấm, phẩy hoặc khoảng trắng (“180.000”). “1.5” không hợp lệ.
const WHOLE_NUMBER_PATTERN = /^(\d+|\d{1,3}([.,\s]\d{3})+)$/;

/** Chuỗi nhập → số nguyên không âm; không hợp lệ → NaN. */
function toWholeNumber(text: string) {
  const value = text.trim();
  return WHOLE_NUMBER_PATTERN.test(value) ? Number(value.replace(/[.,\s]/g, "")) : Number.NaN;
}

// Khớp HotelPricingRowRequestValidator và HotelPricingRequestValidator của backend.
const MAX_AMOUNT = 999_999_999_999;

// ── Giá lưu trú, giá thức ăn, phí phạt trả muộn (FR-HTL-03) ──

/** Giá lưu trú và giá thức ăn của một ô trong bảng; giữ dạng chuỗi như người dùng nhập, rỗng là chưa đặt giá. */
type PricingCellValues = { pricePerNight: string; foodPerNight: string };

export type HotelPricingFormValues = {
  /** Có đủ ô cho mọi loài và nhóm; ô của nhóm không tồn tại (chuột lang Vừa) không hiển thị và không gửi. */
  pricing: Record<Species, Record<SizeGroup, PricingCellValues>>;
  lateFeePerBlock: string;
};

function emptyCell(): PricingCellValues {
  return { pricePerNight: "", foodPerNight: "" };
}

function emptyPricing(): HotelPricingFormValues["pricing"] {
  return {
    Dog: { Small: emptyCell(), Medium: emptyCell(), Large: emptyCell() },
    Cat: { Small: emptyCell(), Medium: emptyCell(), Large: emptyCell() },
    Rabbit: { Small: emptyCell(), Medium: emptyCell(), Large: emptyCell() },
    GuineaPig: { Small: emptyCell(), Medium: emptyCell(), Large: emptyCell() },
  };
}

/** Giá trị ban đầu của form: giá đang lưu ở backend; ô chưa có giá để trống. */
export function toHotelPricingFormValues(data: HotelPricing): HotelPricingFormValues {
  const pricing = emptyPricing();
  for (const row of data.pricing) {
    pricing[row.species][row.sizeGroup] = {
      pricePerNight: String(row.pricePerNight),
      foodPerNight: String(row.foodPerNight),
    };
  }
  return { pricing, lateFeePerBlock: String(data.lateFeePerBlock) };
}

/**
 * Lỗi đầu tiên trong bảng giá, hoặc null nếu hợp lệ. `saved` là giá đang lưu ở backend.
 * Nhóm chưa có giá mà để trống cả hai ô thì không gửi; nhóm đã có giá thì không được để trống vì backend không có thao tác xóa giá
 * (dòng không gửi thì giữ nguyên, form sẽ hiện ô trống trong khi giá cũ vẫn còn). Đã nhập một ô thì ô còn lại bắt buộc;
 * giá là số nguyên từ 0 đến 999.999.999.999 (SA 6.6, BR-22).
 */
export function findHotelPricingIssue(pricing: HotelPricingFormValues["pricing"], saved: HotelPricing) {
  for (const species of SPECIES_ORDER) {
    for (const sizeGroup of SIZE_GROUPS_BY_SPECIES[species]) {
      const cell = pricing[species][sizeGroup];
      const target = `nhóm ${SIZE_GROUP_LABELS[sizeGroup]} của ${SPECIES_LABELS[species]}`;
      const isPriceBlank = cell.pricePerNight.trim() === "";
      const isFoodBlank = cell.foodPerNight.trim() === "";

      if (isPriceBlank && isFoodBlank) {
        const hasSavedPrice = saved.pricing.some((row) => row.species === species && row.sizeGroup === sizeGroup);
        if (hasSavedPrice) return `Giá của ${target} đã được thiết lập, không thể để trống. Hãy nhập giá mới.`;
        continue;
      }
      if (isPriceBlank) return `Thiếu giá lưu trú/đêm cho ${target}.`;
      if (isFoodBlank) return `Thiếu giá thức ăn/đêm cho ${target}.`;

      const price = toWholeNumber(cell.pricePerNight);
      const food = toWholeNumber(cell.foodPerNight);
      if (Number.isNaN(price)) return `Giá lưu trú/đêm của ${target} phải là số nguyên không âm.`;
      if (Number.isNaN(food)) return `Giá thức ăn/đêm của ${target} phải là số nguyên không âm.`;
      if (price > MAX_AMOUNT || food > MAX_AMOUNT) return `Giá tối đa 999.999.999.999đ (${target}).`;
    }
  }
  return null;
}

/** Chuyển form → body PUT /hotel/pricing. Chỉ gửi các nhóm đã nhập giá; gọi sau khi `findHotelPricingIssue` trả null và mức phí đã hợp lệ. */
export function toHotelPricing(values: HotelPricingFormValues): HotelPricing {
  const pricing: HotelPricingRow[] = SPECIES_ORDER.flatMap((species) =>
    SIZE_GROUPS_BY_SPECIES[species].flatMap((sizeGroup) => {
      const cell = values.pricing[species][sizeGroup];
      if (cell.pricePerNight.trim() === "" && cell.foodPerNight.trim() === "") return [];
      return [
        {
          species,
          sizeGroup,
          pricePerNight: toWholeNumber(cell.pricePerNight),
          foodPerNight: toWholeNumber(cell.foodPerNight),
        },
      ];
    }),
  );

  return { pricing, lateFeePerBlock: toWholeNumber(values.lateFeePerBlock) };
}

export function validateLateFee(value: string) {
  if (value.trim() === "") return "Vui lòng nhập mức phí mỗi lần.";
  const amount = toWholeNumber(value);
  if (Number.isNaN(amount)) return "Mức phí phải là số nguyên không âm.";
  if (amount > MAX_AMOUNT) return "Mức phí tối đa 999.999.999.999đ.";
  return true;
}
