"use client";

// CW-02 Đăng nhập – UI-Screens.md
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/errors";
import { useLogin } from "@/lib/auth/session";
import { SESSION_MESSAGES } from "@/lib/auth/session-config";
import { getSafeNextPath, ROUTES } from "@/lib/routes";
import { STORE_INFO } from "@/lib/store-info";
import { validatePassword } from "@/lib/validation";
import { LOGIN_DEFAULT_VALUES, toLoginRequest, validateLoginPhone, type LoginFormValues } from "../forms";

/** 401 không nêu trường nào sai; 403 là tài khoản không thuộc web khách hàng (route handler đã thu hồi phiên). */
function getLoginErrorMessage(error: ApiError) {
  if (error.status === 401) return "Thông tin đăng nhập không đúng.";
  if (error.status === 403) return SESSION_MESSAGES.wrongRole;
  return undefined;
}

export function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const { reset: resetLogin } = login;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: LOGIN_DEFAULT_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Next.js 16 giữ trạng thái màn đã rời (React Activity) để quay lại nhanh; effect được dọn khi màn bị ẩn.
  // Rời màn thì xóa mật khẩu đã nhập và trạng thái gửi, để lần quay lại (vd. hết phiên) là form mới.
  useEffect(
    () => () => {
      reset();
      resetLogin();
    },
    [reset, resetLogin],
  );

  const onSubmit = handleSubmit((values) => {
    login.mutate(toLoginRequest(values), {
      onSuccess: () => {
        // Trang đích: ?next= nếu là đường dẫn nội bộ, không có thì trang chủ (User-Flows 4.1).
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(getSafeNextPath(next) ?? ROUTES.home);
      },
    });
  });

  return (
    <AuthLayout
      title="Chào mừng bạn quay lại. Bé nhà mình hôm nay thế nào?"
      description="Đăng nhập để xem lịch hẹn, xác nhận chi phí khi cần và nhận thông báo từ cửa hàng."
      species={["Cat", "Dog"]}
    >
      <h1>Đăng nhập</h1>
      <p className="mt-1 text-muted">Dùng số điện thoại bạn đã đăng ký.</p>
      {login.error && (
        <ErrorAlert error={login.error} message={getLoginErrorMessage(login.error)} className="mt-4" />
      )}
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field id="login-phone" label="Số điện thoại" error={errors.userName?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("userName", { validate: validateLoginPhone })}
              prefixIcon="phone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              maxLength={20}
            />
          )}
        </Field>
        <Field id="login-password" label="Mật khẩu" error={errors.password?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("password", { validate: validatePassword })}
              prefixIcon="key"
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>
        {/* Giữ trạng thái đang gửi cả lúc chuyển trang sau khi đăng nhập xong để không bấm lại được. */}
        <Button type="submit" variant="primary" size="lg" block loading={login.isPending || login.isSuccess}>
          Đăng nhập
        </Button>
        <p className="text-center text-muted">
          Chưa có tài khoản?{" "}
          <Link href={ROUTES.register} className="font-semibold text-lagoon hover:text-lagoon-700">
            Đăng ký
          </Link>
        </p>
        <p className="text-center text-xs text-muted">
          Cần hỗ trợ tài khoản? Gọi hotline <span className="font-semibold tabular-nums">{STORE_INFO.hotline}</span>
        </p>
      </form>
    </AuthLayout>
  );
}
