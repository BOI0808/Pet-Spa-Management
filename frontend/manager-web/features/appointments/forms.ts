// MW-05 vùng 7 – ô cân nặng thực tế khi tiếp nhận / đối chiếu cân nặng (FR-EXE-02, FR-EXE-10; BR-23).

export type ActualWeightFormValues = {
  /** Cân nặng thực tế (kg), giữ dạng chuỗi như người dùng nhập (“11,2”). */
  actualWeightKg: string;
};

/** Câu của SA 6.6 cho ô cân nặng thực tế khi tiếp nhận. */
export const WEIGHT_REQUIRED_MESSAGE = "Vui lòng nhập cân nặng thực tế lớn hơn 0.";

/** Giới hạn của backend (`ActualWeightRequestValidator`: PrecisionScale(5, 2)). */
export const WEIGHT_PRECISION_MESSAGE = "Cân nặng tối đa 3 chữ số nguyên và 2 chữ số thập phân.";

const NUMBER_PATTERN = /^\d+([.,]\d+)?$/;
const BACKEND_PRECISION_PATTERN = /^\d{1,3}([.,]\d{1,2})?$/;

/** Chuỗi nhập → số kg; dấu phẩy thập phân đổi thành dấu chấm (“9,5” → 9.5). Gọi sau khi `validateActualWeight` trả `true`. */
export function toWeightKg(text: string) {
  return Number(text.trim().replace(",", "."));
}

/** Kiểm ở web chỉ để báo sớm; backend vẫn kiểm lại và quyết định (nhóm kích cỡ, chi phí mới). */
export function validateActualWeight(value: string) {
  const text = value.trim();
  if (!NUMBER_PATTERN.test(text) || toWeightKg(text) <= 0) return WEIGHT_REQUIRED_MESSAGE;
  if (!BACKEND_PRECISION_PATTERN.test(text)) return WEIGHT_PRECISION_MESSAGE;
  return true;
}
