import type { Role } from "@/lib/api/types";

/** Vai trò duy nhất được dùng web này (BR-05). Hai web còn lại có hằng số riêng của mình (FA 3.3). */
export const ALLOWED_ROLE: Role = "Manager";

/** Cookie httpOnly giữ refresh token; chỉ route handler `app/api/session/*` và `proxy.ts` đọc được (FA 6.2). */
export const REFRESH_COOKIE = "ps_rt";

/** 7 ngày, bằng `Jwt__RefreshTokenDays` trong backend/.env.example. */
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
