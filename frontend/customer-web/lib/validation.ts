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
