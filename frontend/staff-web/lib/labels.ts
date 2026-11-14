import type { SizeGroup, SlotGroup, Species, Temperament } from "@/lib/api/types";

// Nhãn hiển thị cho giá trị enum của API (UI-Screens 2.4). Không viết lại các chuỗi này trong màn hình.

export const SPECIES_LABELS: Record<Species, string> = {
  Dog: "Chó",
  Cat: "Mèo",
  Rabbit: "Thỏ",
  GuineaPig: "Chuột lang",
};

/** Hiển thị kèm chữ “Nhóm”, ví dụ “Nhóm Nhỏ”. */
export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  Small: "Nhỏ",
  Medium: "Vừa",
  Large: "Lớn",
};

/** Thứ tự hiển thị trong các bảng giá, theo khai báo nhãn ở trên. */
export const SPECIES_ORDER = Object.keys(SPECIES_LABELS) as Species[];
export const SIZE_GROUP_ORDER = Object.keys(SIZE_GROUP_LABELS) as SizeGroup[];

export const TEMPERAMENT_LABELS: Record<Temperament, string> = {
  Calm: "Hiền",
  Normal: "Bình thường",
  Difficult: "Khó tính, dữ",
};

/** Nhóm mốc giờ: Morning trước 12:00, Afternoon 12:00 – 14:00, Evening từ 15:00 (SlotService ở backend, SA 2.3.3). */
export const SLOT_GROUP_LABELS: Record<SlotGroup, string> = {
  Morning: "Sáng",
  Afternoon: "Trưa",
  Evening: "Chiều, tối",
};

export const SLOT_GROUP_ORDER = Object.keys(SLOT_GROUP_LABELS) as SlotGroup[];
