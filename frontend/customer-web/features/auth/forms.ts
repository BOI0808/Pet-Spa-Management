import type { LoginRequest, RegisterRequest } from "@/lib/api/types";
import { normalizePhone } from "@/lib/validation";

// CW-02 Đăng nhập
export type LoginFormValues = { userName: string; password: string };

export const LOGIN_DEFAULT_VALUES: LoginFormValues = { userName: "", password: "" };

/** Chỉ kiểm tra có nhập; không kiểm tra định dạng để không lộ quy tắc (giống LoginRequestValidator của backend). */
export function validateLoginPhone(value: string) {
  return value.trim() !== "" || "Vui lòng nhập số điện thoại.";
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { userName: normalizePhone(values.userName), password: values.password };
}

// CW-01 Đăng ký
export type RegisterFormValues = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const REGISTER_DEFAULT_VALUES: RegisterFormValues = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const DUPLICATE_PHONE_MESSAGE = "Thông tin liên hệ này đã được sử dụng. Hãy đăng nhập hoặc dùng số khác.";

/** Số điện thoại là tên đăng nhập; email trống thì bỏ trường; không gửi role (Auth 3.2). */
export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  const email = values.email.trim();
  return {
    userName: normalizePhone(values.phone),
    fullName: values.fullName.trim(),
    password: values.password,
    ...(email ? { email } : {}),
  };
}
