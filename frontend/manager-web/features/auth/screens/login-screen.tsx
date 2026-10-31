// MW-01 Đăng nhập – UI-Screens.md (UC-02, FR-ACC-02)
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { Icon, PawLogo } from "@/components/icons";
import { loginSession } from "@/lib/api/endpoints/session";
import { ApiError, isForbiddenError } from "@/lib/api/errors";
import { getSafeNext } from "@/lib/auth/login-url";
import { setAccessToken } from "@/lib/auth/session";
import { meKeys } from "@/lib/auth/use-session";
import { ROUTES } from "@/lib/routes";
import { LOGIN_DEFAULT_VALUES, LOGIN_RULES, toLoginRequest, type LoginFormValues } from "../forms";

// Hai câu này do web đặt, không đến từ backend; đóng gói thành ApiError để `ErrorAlert` hiển thị (`detail`).
const SESSION_EXPIRED_ERROR = new ApiError({
  kind: "http",
  status: 401,
  code: "UNAUTHENTICATED",
  detail: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
});
const WRONG_WEB_ERROR = new ApiError({
  kind: "http",
  status: 401,
  code: "UNAUTHENTICATED",
  detail: "Tài khoản không có quyền truy cập web này",
});

// Số đo và mã màu viết thẳng lấy từ ui-demo (.auth, .auth-art, .label, .input, .btn-lg, .btn:disabled); chưa có token.
const labelClass = "mb-1.5 block text-[13px] font-semibold leading-[18px]";
const inputClass =
  "h-[42px] w-full rounded-[10px] border bg-white pl-[38px] pr-3 text-ink hover:border-[#B7CDD1] focus:border-lagoon focus:outline-none focus:ring-[3px] focus:ring-lagoon/20";
const submitClass =
  "min-h-12 w-full rounded-[10px] bg-lagoon px-[22px] text-[15px] font-semibold text-white hover:bg-lagoon-700 disabled:cursor-not-allowed disabled:bg-[#E5ECEE] disabled:text-[#869AA0]";

export function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: LOGIN_DEFAULT_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const login = useMutation({
    mutationFn: loginSession,
    onSuccess: ({ accessToken, me }) => {
      queryClient.clear(); // bỏ dữ liệu còn lại của phiên trước (nếu có)
      setAccessToken(accessToken);
      queryClient.setQueryData(meKeys.all, me);
      router.replace(getSafeNext(searchParams.get("next")) ?? ROUTES.dashboard);
    },
  });

  // 403 từ route handler phiên nghĩa là đúng mật khẩu nhưng không phải Quản lý (User-Flows 4.2).
  const reasonError = reason === "expired" ? SESSION_EXPIRED_ERROR : reason === "wrong-web" ? WRONG_WEB_ERROR : null;
  const alertError = isForbiddenError(login.error) ? WRONG_WEB_ERROR : (login.error ?? reasonError);

  const handleLogin = (values: LoginFormValues) => login.mutate(toLoginRequest(values));

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <div className="relative flex flex-col overflow-hidden bg-lagoon-800 px-14 py-12 text-white max-[980px]:hidden">
        <span aria-hidden="true" className="absolute -right-20 -top-20 size-[360px] rounded-full bg-white/[.06]" />
        <span aria-hidden="true" className="absolute right-[60px] top-[120px] size-40 rounded-full bg-apricot/[.18]" />
        <div className="relative flex items-center gap-2.5 text-base font-bold">
          <span className="relative grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-white after:absolute after:-right-[3px] after:-top-[3px] after:size-[11px] after:rounded-full after:border-2 after:border-lagoon after:bg-apricot after:content-['']">
            <PawLogo className="size-5 fill-lagoon" />
          </span>
          <span>
            Spa thú cưng
            <small className="block text-[11px] font-medium leading-[14px] text-[#A9D9DC]">Web quản lý</small>
          </span>
        </div>
        <h2 className="relative mt-auto max-w-[460px] text-[34px] font-bold leading-[42px] tracking-[-0.02em]">
          Điều hành cửa hàng, từ lịch hẹn đến chuồng và nhân viên.
        </h2>
        <p className="relative mt-3.5 max-w-[420px] text-[15px] leading-6 text-[#C9E9EB]">
          Xác nhận lịch, phân công nhân viên spa, gán chuồng, theo dõi tiến độ và thanh toán của cả cửa hàng.
        </p>
      </div>

      <div className="flex items-center justify-center bg-white px-8 py-12 max-[980px]:px-4">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[26px] leading-[34px]">Đăng nhập quản lý</h1>
          <p className="mt-1 text-muted">Dùng số điện thoại và mật khẩu của tài khoản quản lý.</p>

          <ErrorAlert error={alertError} className="mt-4" />

          <form noValidate onSubmit={handleSubmit(handleLogin)} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="userName" className={labelClass}>
                Số điện thoại
              </label>
              <div className="relative">
                <Icon name="phone" className="absolute left-3 top-3 size-[18px] text-muted" />
                <input
                  id="userName"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  aria-invalid={errors.userName ? true : undefined}
                  aria-describedby={errors.userName ? "userName-error" : undefined}
                  className={`${inputClass} ${errors.userName ? "border-danger" : "border-line"}`}
                  {...register("userName", LOGIN_RULES.userName)}
                />
              </div>
              <FieldError id="userName-error" message={errors.userName?.message} />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Mật khẩu
              </label>
              <div className="relative">
                <Icon name="key" className="absolute left-3 top-3 size-[18px] text-muted" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`${inputClass} ${errors.password ? "border-danger" : "border-line"}`}
                  {...register("password", LOGIN_RULES.password)}
                />
              </div>
              <FieldError id="password-error" message={errors.password?.message} />
            </div>

            <button type="submit" disabled={login.isPending} className={submitClass}>
              {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
