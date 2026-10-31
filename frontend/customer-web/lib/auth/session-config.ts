import type { Role } from "@/lib/api/types";

// Dùng chung cho trình duyệt, route handler phiên và proxy.ts. Giữa 3 web chỉ khác ALLOWED_ROLE (Frontend-Architecture 3.3).

/** Vai trò được vào web khách hàng (Auth 3.6). */
export const ALLOWED_ROLE: Role = "Customer";

/** Cookie httpOnly giữ refresh token (Frontend-Architecture 6.2). */
export const REFRESH_TOKEN_COOKIE = "ps_rt";

export const SESSION_MESSAGES = {
  expired: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
  wrongRole: "Tài khoản không có quyền truy cập web này",
} as const;
