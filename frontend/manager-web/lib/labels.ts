// Nhãn hiển thị cho giá trị enum của API (UI-Screens 2.4). Chỉ khai báo enum web quản lý đang dùng.
import type { SizeGroup, Species } from "@/lib/api/types";

/** Thứ tự hiển thị các loài: Chó, Mèo, Thỏ, Chuột lang (UI demo). */
export const SPECIES_ORDER: readonly Species[] = ["Dog", "Cat", "Rabbit", "GuineaPig"];

export const SPECIES_LABELS: Record<Species, string> = {
  Dog: "Chó",
  Cat: "Mèo",
  Rabbit: "Thỏ",
  GuineaPig: "Chuột lang",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  Small: "Nhỏ",
  Medium: "Vừa",
  Large: "Lớn",
};
