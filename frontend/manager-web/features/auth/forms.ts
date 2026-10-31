import type { RegisterOptions } from "react-hook-form";
import type { LoginRequest } from "@/lib/api/types";

export type LoginFormValues = {
  userName: string;
  password: string;
};

export const LOGIN_DEFAULT_VALUES: LoginFormValues = { userName: "", password: "" };

// Chỉ kiểm tra có nhập: backend cũng không kiểm tra định dạng khi đăng nhập (LoginRequestValidator). Câu lỗi theo Frontend-Conventions 4.2.
export const LOGIN_RULES = {
  userName: { validate: (value) => value.trim() !== "" || "Vui lòng nhập số điện thoại." },
  password: { required: "Vui lòng nhập mật khẩu." },
} satisfies {
  userName: RegisterOptions<LoginFormValues, "userName">;
  password: RegisterOptions<LoginFormValues, "password">;
};

/** Bỏ khoảng trắng, dấu chấm, gạch ngang của số điện thoại (Frontend-Conventions 4.1) như backend; chỉ gửi hai trường này. */
export function toLoginRequest({ userName, password }: LoginFormValues): LoginRequest {
  return { userName: userName.replace(/[\s.-]/g, ""), password };
}
