import type { Me, Role } from "@/lib/api/types";

/** Vai trò duy nhất được dùng web này (BR-05). Hai web còn lại có hằng số riêng của mình. */
export const ALLOWED_ROLE: Role = "Staff";

/**
 * Cookie httpOnly giữ refresh token; chỉ route handler `app/api/session/*` và `proxy.ts` đọc được.
 * Tên riêng của web nhân viên: cookie không tách theo cổng, nên khi chạy 3 web trên cùng `localhost` mà dùng chung tên
 * `ps_rt`, mở web này sẽ đọc cookie của web kia, thấy sai vai trò rồi thu hồi luôn phiên của web kia.
 */
export const REFRESH_COOKIE = "ps_rt_staff";

/** 7 ngày, bằng `Jwt__RefreshTokenDays` trong backend/.env.example. */
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Tài khoản được dùng web nhân viên: `role = Staff` và có `staffRole` (lễ tân hoặc nhân viên spa).
 * Thiếu `staffRole` là dữ liệu lỗi; không biết vai trò thì không hiện menu nào, nên coi như không có quyền.
 */
export function isStaffAccount(me: Me) {
  return me.role === ALLOWED_ROLE && (me.staffRole === "Receptionist" || me.staffRole === "SpaStaff");
}
