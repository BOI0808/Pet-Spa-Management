// Định dạng hiển thị (Frontend-Conventions 7). Giá trị gửi API giữ nguyên dạng gốc.

/** “0903412678” → “0903 412 678”; chuỗi khác giữ nguyên. Chỉ để hiển thị, gửi API dạng liền. */
export function formatPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

// Tên người Việt: tên gọi nằm cuối, nên tên ngắn và chữ cái đầu lấy từ hai chữ cuối (“Trần Minh Anh” → “Minh Anh”, “MA”).
function lastWords(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).slice(-2);
}

/** Tên ngắn trên thanh trên: “Trần Minh Anh” → “Minh Anh”. */
export function getShortName(fullName: string) {
  return lastWords(fullName).join(" ");
}

/** Chữ cái đầu trong avatar: “Trần Minh Anh” → “MA”. */
export function getInitials(fullName: string) {
  return lastWords(fullName)
    .map((word) => word.charAt(0).toLocaleUpperCase("vi-VN"))
    .join("");
}

// Số thập phân kiểu Việt Nam (dấu phẩy), không nhóm hàng nghìn vì cân nặng, chiều cao đều nhỏ.
const decimalFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2, useGrouping: false });
const weightFormat = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** 1.5 → “1,5”; 30 → “30”. */
export function formatDecimal(value: number) {
  return decimalFormat.format(value);
}

/** 9 → “9,0 kg”; giữ chữ số thập phân thứ hai nếu có (4.25 → “4,25 kg”) để không làm tròn số khách đã khai. */
export function formatWeight(kg: number) {
  return `${weightFormat.format(kg)} kg`;
}
