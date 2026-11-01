import type { Me, Role } from "@/lib/api/types";

/** Vai trò duy nhất được dùng web này (BR-05). Hai web còn lại có hằng số riêng của mình. */
export const ALLOWED_ROLE: Role = "Staff";

/** Cookie httpOnly giữ refresh token; chỉ route handler `app/api/session/*` và `proxy.ts` đọc được. */
export const REFRESH_COOKIE = "ps_rt";

/** 7 ngày, bằng `Jwt__RefreshTokenDays` trong backend/.env.example. */
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Tài khoản được dùng web nhân viên: `role = Staff` và có `staffRole` (lễ tân hoặc nhân viên spa).
 * Thiếu `staffRole` là dữ liệu lỗi; không biết vai trò thì không hiện menu nào, nên coi như không có quyền.
 */
export function isStaffAccount(me: Me) {
  return me.role === ALLOWED_ROLE && (me.staffRole === "Receptionist" || me.staffRole === "SpaStaff");
}
