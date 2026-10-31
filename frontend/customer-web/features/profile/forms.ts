import type { Me, UpdateMeRequest } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { normalizePhone } from "@/lib/validation";

// CW-13 Hồ sơ cá nhân
export type ProfileFormValues = { fullName: string; phone: string; email: string };

export function toProfileFormValues(source: Pick<Me, "fullName" | "phone" | "email">): ProfileFormValues {
  return {
    fullName: source.fullName ?? "",
    phone: source.phone ? formatPhone(source.phone) : "",
    email: source.email ?? "",
  };
}

/**
 * PUT /me ghi đè cả email: email trống thì bỏ trường và backend xóa email đã lưu.
 * Số điện thoại gửi dạng liền; trùng số đang dùng thì backend không đổi tên đăng nhập.
 */
export function toUpdateMeRequest(values: ProfileFormValues): UpdateMeRequest {
  const email = values.email.trim();
  return {
    fullName: values.fullName.trim(),
    phone: normalizePhone(values.phone),
    ...(email ? { email } : {}),
  };
}

export const DUPLICATE_PHONE_MESSAGE = "Thông tin liên hệ này đã được sử dụng.";
