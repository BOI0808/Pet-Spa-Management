// Luật kiểm tra dữ liệu nhập dùng ở nhiều màn (Frontend-Conventions 4.2). Mỗi hàm trả true hoặc câu lỗi,
// dùng thẳng cho `validate` của React Hook Form. Backend vẫn kiểm tra lại (FluentValidation).

const PHONE_PATTERN = /^0\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Giống PhoneNumber.Normalize ở backend: bỏ khoảng trắng, `.`, `-`, `(`, `)`; đầu “+84” đổi thành “0”. */
export function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s.\-()]/g, "");
  return cleaned.startsWith("+84") ? `0${cleaned.slice(3)}` : cleaned;
}

export function validateFullName(value: string) {
  const fullName = value.trim();
  if (!fullName) return "Vui lòng nhập họ tên.";
  if (fullName.length > 150) return "Họ tên tối đa 150 ký tự.";
  return true;
}

/** Số điện thoại Việt Nam: sau khi chuẩn hóa đủ 10 chữ số, bắt đầu bằng 0 (X-02). */
export function validatePhone(value: string) {
  const phone = normalizePhone(value);
  if (!phone) return "Vui lòng nhập số điện thoại.";
  if (!PHONE_PATTERN.test(phone)) return "Số điện thoại chưa đúng định dạng.";
  return true;
}

/** Email không bắt buộc; có thì đúng dạng a@b.c, tối đa 150 ký tự. */
export function validateOptionalEmail(value: string) {
  const email = value.trim();
  if (!email) return true;
  if (email.length > 150) return "Email tối đa 150 ký tự.";
  if (!EMAIL_PATTERN.test(email)) return "Email chưa đúng định dạng.";
  return true;
}

/** Độ mạnh mật khẩu do backend (Identity) quyết định, web chỉ kiểm tra có nhập. */
export function validatePassword(value: string) {
  return value !== "" || "Vui lòng nhập mật khẩu.";
}

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/** Số khách nhập, chấp nhận dấu phẩy thập phân: “9,5” → 9.5. Không phải số thập phân không âm → null. */
export function parseDecimal(value: string): number | null {
  const text = value.trim().replace(",", ".");
  return DECIMAL_PATTERN.test(text) ? Number(text) : null;
}

/** Đúng độ chính xác cột trong DB (numeric(5,2) cho cân nặng, numeric(5,1) cho chiều cao). */
function fitsPrecision(value: string, integerDigits: number, fractionDigits: number) {
  const [integerPart, fractionPart = ""] = value.trim().replace(",", ".").split(".");
  return integerPart.replace(/^0+(?=\d)/, "").length <= integerDigits && fractionPart.length <= fractionDigits;
}

export function validatePetName(value: string) {
  const name = value.trim();
  if (!name) return "Vui lòng nhập tên thú cưng.";
  if (name.length > 100) return "Tên thú cưng tối đa 100 ký tự.";
  return true;
}

export function validateBreed(value: string) {
  const breed = value.trim();
  if (!breed) return "Vui lòng nhập giống.";
  if (breed.length > 100) return "Giống tối đa 100 ký tự.";
  return true;
}

/** Cân nặng (kg) bắt buộc, lớn hơn 0; câu giới hạn độ chính xác giống backend (PetRequestValidator). */
export function validateWeightKg(value: string) {
  const weight = parseDecimal(value);
  if (weight === null || weight <= 0) return "Vui lòng nhập cân nặng lớn hơn 0.";
  if (!fitsPrecision(value, 3, 2)) return "Cân nặng tối đa 3 chữ số nguyên và 2 chữ số thập phân.";
  return true;
}

/** Chiều cao vai (cm) chỉ bắt buộc với chó (FR-PET-01); loài khác không gửi chiều cao. */
export function validateHeightCm(value: string, required: boolean) {
  if (!required) return true;
  const height = parseDecimal(value);
  if (height === null || height <= 0) return "Vui lòng nhập chiều cao của chó.";
  if (!fitsPrecision(value, 4, 1)) return "Chiều cao tối đa 4 chữ số nguyên và 1 chữ số thập phân.";
  return true;
}
