"use client";

// CW-13 Hồ sơ cá nhân – UI-Screens.md
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { Me } from "@/lib/api/types";
import { useSession } from "@/lib/auth/session";
import { getInitials } from "@/lib/format";
import { useUpdateMe } from "@/lib/queries/me";
import { usePets } from "@/lib/queries/pets";
import { validateFullName, validateOptionalEmail, validatePhone } from "@/lib/validation";
import { DUPLICATE_PHONE_MESSAGE, toProfileFormValues, toUpdateMeRequest, type ProfileFormValues } from "../forms";

/** Vùng 1 – Thông tin của bạn. */
function ProfileForm({ me }: { me: Me }) {
  const { showSuccess } = useToast();
  const updateMe = useUpdateMe();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: toProfileFormValues(me),
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const onSubmit = handleSubmit((values) => {
    const request = toUpdateMeRequest(values);
    updateMe.mutate(request, {
      onSuccess: () => {
        // Giá trị vừa lưu thành mốc mới cho nút “Hủy bỏ”.
        reset(toProfileFormValues({ fullName: request.fullName, phone: request.phone, email: request.email }));
        showSuccess("Đã lưu thông tin cá nhân");
      },
      onError: (error) => {
        if (error.code === "DUPLICATE_CONTACT") setError("phone", { message: DUPLICATE_PHONE_MESSAGE }, { shouldFocus: true });
      },
    });
  });

  function handleCancel() {
    reset();
    updateMe.reset();
  }

  const formError = updateMe.error?.code === "DUPLICATE_CONTACT" ? null : updateMe.error;

  return (
    <Card>
      <CardHeader title="Thông tin của bạn" />
      <form noValidate onSubmit={onSubmit}>
        <CardBody className="grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
          {formError && <ErrorAlert error={formError} className="col-span-2 max-[640px]:col-span-1" />}
          <Field
            id="profile-full-name"
            label="Họ tên"
            required
            error={errors.fullName?.message}
            className="col-span-2 max-[640px]:col-span-1"
          >
            {(control) => (
              <Input
                {...control}
                {...register("fullName", { validate: validateFullName })}
                autoComplete="name"
                maxLength={150}
              />
            )}
          </Field>
          <Field
            id="profile-phone"
            label="Số điện thoại"
            required
            hint="Cũng là tên đăng nhập. Đổi số sẽ đổi luôn tên đăng nhập."
            error={errors.phone?.message}
          >
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
          <Field id="profile-email" label="Email" optional error={errors.email?.message}>
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
        </CardBody>
        <CardFooter>
          <Button variant="ghost" onClick={handleCancel} disabled={updateMe.isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" className="ml-auto" loading={updateMe.isPending}>
            Lưu thay đổi
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Vùng 2 – Tóm tắt tài khoản. Ẩn “Khách hàng từ …” và “Tự đặt lịch trực tuyến” vì GET /me chưa trả (UI-Screens G-04). */
function AccountSummary({ me }: { me: Me }) {
  const fullName = me.fullName ?? me.userName;
  // Chỉ cần tổng số hồ sơ đang hoạt động nên lấy trang 1 cỡ 1.
  const pets = usePets({ page: 1, pageSize: 1 });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Avatar initials={getInitials(fullName)} size="lg" />
        <h2 className="min-w-0 break-words">{fullName}</h2>
      </div>
      <div className="my-4 h-px bg-line" />
      <div className="flex items-center justify-between gap-4 py-[7px]">
        <span className="text-muted">Thú cưng</span>
        {pets.isPending ? (
          <Skeleton className="h-3.5 w-16" />
        ) : (
          <span className="text-right font-medium">{pets.isError ? "—" : `${pets.data.total} hồ sơ`}</span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Vắng mặt quá 3 lần trong 30 ngày, quyền tự đặt lịch sẽ tạm khóa cho đến khi bạn liên hệ cửa hàng.
      </p>
    </Card>
  );
}

export function ProfileScreen() {
  const { me, logout } = useSession();
  // SessionGate chỉ hiện màn khi đã có GET /me.
  if (!me) return null;

  return (
    <>
      <div className="mb-6">
        <h1>Hồ sơ cá nhân</h1>
        <p className="mt-1 text-muted">Thông tin liên hệ cửa hàng dùng khi cần báo cho bạn.</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <ProfileForm key={me.userId} me={me} />
        <aside className="flex flex-col gap-4">
          <AccountSummary me={me} />
          {/* Vùng 3 – Đăng xuất (User-Flows 4.2). */}
          <Button variant="quiet" onClick={() => void logout()}>
            <Icon name="logout" />
            Đăng xuất
          </Button>
        </aside>
      </div>
    </>
  );
}
