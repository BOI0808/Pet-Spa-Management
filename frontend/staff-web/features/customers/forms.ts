import type { WalkInRequest } from "@/lib/api/types";
import { normalizePhone } from "@/lib/validation";

// SW-04 Khách hàng: tìm khách, ghi nhận khách vãng lai.

const FULL_PHONE_PATTERN = /^0\d{9}$/;

/**
 * Từ khóa tìm khách: số điện thoại đã bỏ khoảng trắng, dấu chấm, gạch ngang, ngoặc như backend.
 * Backend tìm theo một phần số (Contains), nên gõ “0903” vẫn ra danh sách.
 */
export function toSearchTerm(value: string) {
  return normalizePhone(value);
}

/** Đủ 10 chữ số, bắt đầu bằng 0: chỉ khi đó mới mời ghi nhận khách vãng lai (một phần số thì chưa biết là khách mới). */
export function isFullPhone(value: string) {
  return FULL_PHONE_PATTERN.test(value);
}

export type WalkInFormValues = {
  fullName: string;
  phone: string;
};

/** Không gửi gì ngoài họ tên và số điện thoại (WalkInRequest); số gửi dạng liền như backend chuẩn hóa. */
export function toWalkInRequest({ fullName, phone }: WalkInFormValues): WalkInRequest {
  return { fullName: fullName.trim(), phone: normalizePhone(phone) };
}
