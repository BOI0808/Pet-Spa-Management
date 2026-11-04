import type { Cage, CageCreateRequest, HotelPricing, HotelPricingRow, SizeGroup, Species } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { MAX_MONEY_AMOUNT, toWholeNumber } from "@/lib/number-input";
import { SIZE_GROUPS_BY_SPECIES, createPricingGrid } from "@/lib/size-groups";

// MW-07 Chuồng và giá lưu trú – UI-Screens.md (FR-HTL-01 → 03; BR-19, BR-21, BR-22)

/**
 * Mốc trả muộn mặc định: `Hotel.LateGraceMinutes` = 30 (miễn phí) và `Hotel.LateBlockMinutes` = 60 (mỗi khối tính 1 lần), BR-22.
 * Tạm khai báo ở web vì `GET /config` chưa có trên backend (chưa thẻ nào làm API cấu hình, MW-13). Quản lý đổi được hai mốc này
 * ở Cấu hình nên chú thích có thể lệch giá trị thật. Khi có `GET /config` thì đọc từ `settings["Hotel.LateGraceMinutes"]`
 * và `settings["Hotel.LateBlockMinutes"]`.
 */
export const LATE_GRACE_MINUTES = 30;
export const LATE_BLOCK_MINUTES = 60;

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

/** Giá trị ban đầu của form: giá đang lưu ở backend; ô chưa có giá để trống. */
export function toHotelPricingFormValues(data: HotelPricing): HotelPricingFormValues {
  const pricing = createPricingGrid(emptyCell);
  for (const row of data.pricing) {
    pricing[row.species][row.sizeGroup] = {
      pricePerNight: formatAmount(row.pricePerNight),
      foodPerNight: formatAmount(row.foodPerNight),
    };
  }

  // Backend trả phí = 0 cho cả hai trường hợp “chưa thiết lập” và “đã đặt 0”. Chưa có giá nào và phí = 0 thì coi là chưa thiết lập:
  // để trống ô phí để Quản lý phải nhập (validateLateFee báo thiếu), tránh lưu nhầm 0 và làm trả muộn không bị tính phí.
  const isNeverConfigured = data.pricing.length === 0 && data.lateFeePerBlock === 0;
  return { pricing, lateFeePerBlock: isNeverConfigured ? "" : formatAmount(data.lateFeePerBlock) };
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
      if (price > MAX_MONEY_AMOUNT || food > MAX_MONEY_AMOUNT) return `Giá tối đa 999.999.999.999đ (${target}).`;
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
  if (amount > MAX_MONEY_AMOUNT) return "Mức phí tối đa 999.999.999.999đ.";
  return true;
}

// ── Thêm / sửa chuồng (FR-HTL-01, FR-HTL-02) ──

/** Khớp CageCreateRequestValidator của backend. */
const MAX_CAGE_CODE_LENGTH = 20;

/** Cả ba trường đều là ô chọn/nhập: chưa chọn thì là chuỗi rỗng. */
export type CageFormValues = {
  code: string;
  species: Species | "";
  sizeGroup: SizeGroup | "";
};

/** Giá trị ban đầu của hộp thoại: chuồng đang sửa, hoặc để trống khi thêm mới. */
export function toCageFormValues(cage: Cage | null): CageFormValues {
  if (!cage) return { code: "", species: "", sizeGroup: "" };
  return { code: cage.code, species: cage.species, sizeGroup: cage.sizeGroup };
}

export function validateCageCode(value: string) {
  const code = value.trim();
  if (code === "") return "Vui lòng nhập mã chuồng.";
  if (code.length > MAX_CAGE_CODE_LENGTH) return `Mã chuồng tối đa ${MAX_CAGE_CODE_LENGTH} ký tự.`;
  return true;
}

export function validateCageSpecies(value: CageFormValues["species"]) {
  return value !== "" || "Vui lòng chọn loài.";
}

/** Nhóm kích cỡ có áp dụng cho loài này không (BR-19). Chưa chọn nhóm hoặc chưa chọn loài thì coi là phù hợp. */
export function isSizeGroupAllowed(species: string, sizeGroup: CageFormValues["sizeGroup"]) {
  if (sizeGroup === "" || species === "") return true;
  return SPECIES_ORDER.some((item) => item === species && SIZE_GROUPS_BY_SPECIES[item].includes(sizeGroup));
}

export function validateCageSizeGroup(value: CageFormValues["sizeGroup"], values: CageFormValues) {
  if (value === "") return "Vui lòng chọn nhóm kích cỡ.";
  if (!isSizeGroupAllowed(values.species, value)) return "Chuột lang chỉ có nhóm Nhỏ và Lớn.";
  return true;
}

/** Form → body POST/PUT /cages; null khi còn thiếu loài hoặc nhóm (gọi sau khi các ô đã hợp lệ). */
export function toCageRequest(values: CageFormValues): CageCreateRequest | null {
  if (values.species === "" || values.sizeGroup === "") return null;
  return { code: values.code.trim(), species: values.species, sizeGroup: values.sizeGroup };
}
