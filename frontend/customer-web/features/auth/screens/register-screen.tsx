"use client";

// CW-01 Đăng ký – UI-Screens.md
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useRegister } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";
import { validateFullName, validateOptionalEmail, validatePassword, validatePhone } from "@/lib/validation";
import { DUPLICATE_PHONE_MESSAGE, REGISTER_DEFAULT_VALUES, toRegisterRequest, type RegisterFormValues } from "../forms";

export function RegisterScreen() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const registerAccount = useRegister();
  const { reset: resetRegister } = registerAccount;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: REGISTER_DEFAULT_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Rời màn (Next.js giữ trạng thái màn đã rời) thì xóa mật khẩu và trạng thái gửi – như CW-02.
  useEffect(
    () => () => {
      reset();
      resetRegister();
    },
    [reset, resetRegister],
  );

  const onSubmit = handleSubmit((values) => {
    registerAccount.mutate(toRegisterRequest(values), {
      onSuccess: () => {
        // Không tự đăng nhập: về CW-02 kèm lời mời đăng nhập (ui-demo).
        showSuccess("Đã tạo tài khoản. Mời bạn đăng nhập.");
        router.push(ROUTES.login);
      },
      onError: (error) => {
        if (error.code === "DUPLICATE_CONTACT") setError("phone", { message: DUPLICATE_PHONE_MESSAGE }, { shouldFocus: true });
      },
    });
  });

  // DUPLICATE_CONTACT đã hiện dưới ô số điện thoại; lỗi khác (400 mật khẩu chưa đạt, 429, mất mạng) hiện ở đầu form.
  const formError = registerAccount.error?.code === "DUPLICATE_CONTACT" ? null : registerAccount.error;

  return (
    <AuthLayout
      title="Đặt lịch tắm, cắt tỉa hay gửi bé ở lại, chỉ vài bước trên web."
      description="Theo dõi trạng thái lịch hẹn, xem ảnh trước và sau khi chăm sóc, thanh toán trực tuyến khi bé đã xong."
      species={["Dog", "Cat", "Rabbit", "GuineaPig"]}
    >
      <h1>Tạo tài khoản</h1>
      <p className="mt-1 text-muted">Số điện thoại sẽ là tên đăng nhập của bạn.</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <ErrorAlert error={formError} />
        <Field id="register-full-name" label="Họ tên" required error={errors.fullName?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("fullName", { validate: validateFullName })}
              autoComplete="name"
              maxLength={150}
            />
          )}
        </Field>
        <Field id="register-phone" label="Số điện thoại" required error={errors.phone?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("phone", { validate: validatePhone })}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
            />
          )}
        </Field>
        <Field id="register-email" label="Email" optional error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("email", { validate: validateOptionalEmail })}
              type="email"
              autoComplete="email"
              maxLength={150}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <Field id="register-password" label="Mật khẩu" required error={errors.password?.message}>
            {(control) => (
              <Input
                {...control}
                {...register("password", { validate: validatePassword, deps: ["confirmPassword"] })}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>
          <Field id="register-confirm-password" label="Nhập lại mật khẩu" required error={errors.confirmPassword?.message}>
            {(control) => (
              <Input
                {...control}
                {...register("confirmPassword", {
                  validate: (value, formValues) => value === formValues.password || "Mật khẩu nhập lại không khớp.",
                })}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={registerAccount.isPending || registerAccount.isSuccess}
        >
          Tạo tài khoản
        </Button>
        <p className="text-center text-muted">
          Đã có tài khoản?{" "}
          <Link href={ROUTES.login} className="font-semibold text-lagoon hover:text-lagoon-700">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
