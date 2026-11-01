import type { Pet, PetRequest, Species, Temperament } from "@/lib/api/types";
import { parseDecimal } from "@/lib/validation";

// CW-05 Tạo / sửa hồ sơ thú cưng

/** Thứ tự thẻ chọn loài như ui-demo; cửa hàng chỉ phục vụ 4 loài (BR-19). */
export const SPECIES_OPTIONS: readonly Species[] = ["Dog", "Cat", "Rabbit", "GuineaPig"];

/** Thẻ chọn tính cách (UI-Screens CW-05 vùng 4); nhãn lấy từ TEMPERAMENT_LABELS. */
export const TEMPERAMENT_OPTIONS: readonly { value: Temperament; description: string }[] = [
  { value: "Calm", description: "Dễ gần, hợp tác" },
  { value: "Normal", description: "Đôi lúc cần dỗ" },
  { value: "Difficult", description: "Hay cắn, cào, sợ người lạ" },
];

/** Số giữ dạng chuỗi khách gõ (cho phép dấu phẩy), chỉ đổi sang số khi gửi. Chưa chọn loài: chuỗi rỗng. */
export type PetFormValues = {
  species: Species | "";
  name: string;
  breed: string;
  weightKg: string;
  heightCm: string;
  temperament: Temperament;
  coatNote: string;
  notes: string;
};

// Không chọn sẵn loài để khách không lưu nhầm loài; tính cách mặc định Bình thường (API-Notes 8 #11).
export const EMPTY_PET_FORM: PetFormValues = {
  species: "",
  name: "",
  breed: "",
  weightKg: "",
  heightCm: "",
  temperament: "Normal",
  coatNote: "",
  notes: "",
};

/** 4.2 → “4,2” để ô nhập hiển thị số kiểu Việt Nam như ui-demo. */
function toDecimalText(value: number | null | undefined) {
  return value == null ? "" : String(value).replace(".", ",");
}

export function toPetFormValues(pet: Pet): PetFormValues {
  return {
    species: pet.species,
    name: pet.name,
    breed: pet.breed,
    weightKg: toDecimalText(pet.weightKg),
    heightCm: pet.species === "Dog" ? toDecimalText(pet.heightCm) : "",
    temperament: pet.temperament,
    coatNote: pet.coatNote ?? "",
    notes: pet.notes ?? "",
  };
}

/**
 * Form đã qua kiểm tra → body POST/PUT /pets. Không gửi `sizeGroup` (FR-PET-04, DoD B) và `customerId`;
 * chỉ gửi chiều cao khi là chó. PUT ghi đè cả hồ sơ: đặc điểm lông, ghi chú để trống thì bỏ trường và backend xóa giá trị cũ.
 */
export function toPetRequest(values: PetFormValues): PetRequest {
  if (values.species === "") throw new Error("Form chưa chọn loài – validate phải chặn trước khi gửi.");

  const heightCm = values.species === "Dog" ? parseDecimal(values.heightCm) : null;
  const coatNote = values.coatNote.trim();
  const notes = values.notes.trim();

  return {
    name: values.name.trim(),
    species: values.species,
    breed: values.breed.trim(),
    temperament: values.temperament,
    weightKg: parseDecimal(values.weightKg) ?? 0,
    ...(heightCm !== null ? { heightCm } : {}),
    ...(coatNote ? { coatNote } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function validateSpecies(value: PetFormValues["species"]) {
  return value !== "" || "Vui lòng chọn loài.";
}
