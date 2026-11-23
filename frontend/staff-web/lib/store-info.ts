// Thông tin tĩnh của cửa hàng, không phải secret (UI-Screens G-16). Cùng chỗ với customer-web (lib/store-info.ts).
// Tài khoản ngân hàng lấy theo ui-demo SW-09 để minh họa, nhóm cần chốt tài khoản thật.
export const STORE_BANK = {
  bankName: "Vietcombank",
  /** Mã BIN ngân hàng theo chuẩn VietQR (Vietcombank = 970436). */
  bankBin: "970436",
  accountNumber: "0071000686868",
} as const;

/** “0071000686868” → “0071 0006 86868” như ui-demo. Chỉ để hiển thị. */
export function formatAccountNumber(accountNumber: string) {
  return accountNumber.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3");
}

/**
 * Ảnh mã VietQR của tài khoản cửa hàng kèm số tiền và nội dung (img.vietqr.io, Vinh chốt ở thẻ 128). Web không có thư viện
 * tạo QR (C-04) nên dùng ảnh do dịch vụ này dựng. Gửi ra ngoài chỉ gồm số tài khoản cửa hàng, số tiền và nội dung “LH<mã>”,
 * không có thông tin khách. Mẫu `qr_only`: chỉ mã QR, ngân hàng và số tài khoản đã hiện bằng chữ bên cạnh.
 */
export function vietQrImageUrl(amount: number, content: string) {
  const params = new URLSearchParams({ amount: String(amount), addInfo: content });
  return `https://img.vietqr.io/image/${STORE_BANK.bankBin}-${STORE_BANK.accountNumber}-qr_only.png?${params.toString()}`;
}
