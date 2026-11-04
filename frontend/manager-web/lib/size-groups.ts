import type { SizeGroup, Species } from "@/lib/api/types";

/** Các nhóm kích cỡ của từng loài (BR-19): chuột lang chỉ có Nhỏ và Lớn. */
export const SIZE_GROUPS_BY_SPECIES: Record<Species, readonly SizeGroup[]> = {
  Dog: ["Small", "Medium", "Large"],
  Cat: ["Small", "Medium", "Large"],
  Rabbit: ["Small", "Medium", "Large"],
  GuineaPig: ["Small", "Large"],
};

/**
 * Bảng có đủ ô cho mọi loài và nhóm, mỗi ô tạo bằng `makeCell`.
 * Ô của nhóm không tồn tại (chuột lang Vừa) vẫn có để đúng kiểu nhưng không hiển thị và không gửi.
 */
export function createPricingGrid<Cell>(makeCell: () => Cell): Record<Species, Record<SizeGroup, Cell>> {
  return {
    Dog: { Small: makeCell(), Medium: makeCell(), Large: makeCell() },
    Cat: { Small: makeCell(), Medium: makeCell(), Large: makeCell() },
    Rabbit: { Small: makeCell(), Medium: makeCell(), Large: makeCell() },
    GuineaPig: { Small: makeCell(), Medium: makeCell(), Large: makeCell() },
  };
}
