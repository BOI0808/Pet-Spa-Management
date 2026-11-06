"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { toApiError } from "@/lib/api/errors";
import { formatPhone, getInitials } from "@/lib/format";
import { useCreateWalkInCustomer, useCustomerSearch } from "@/lib/queries/customers";
import { customerSearchRoute, petCreateRoute } from "@/lib/routes";
import { setServingCustomer } from "@/lib/serving-customer";
import { normalizePhone, validateFullName, validatePhone } from "@/lib/validation";
import { toWalkInRequest, type WalkInFormValues } from "../forms";

const DUPLICATE_MESSAGE = "Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.";

/** Khách đã có số này (409 DUPLICATE_CONTACT): tìm lại theo số để lễ tân chọn khách hiện có (UI-Screens SW-04). */
function DuplicateCustomer({ phone }: { phone: string }) {
  const router = useRouter();
  const search = useCustomerSearch({ search: phone, page: 1, pageSize: 1 });
  const customer = search.data?.items.find((item) => item.phone === phone);
  if (!customer) return null;

  return (
    <div className="col-span-2 flex flex-wrap items-center gap-3 rounded-xl bg-mist p-3.5 max-[640px]:col-span-1">
      <Avatar initials={getInitials(customer.fullName)} />
      <div className="min-w-0 flex-1">
        <div className="break-words font-semibold">{customer.fullName}</div>
        <div className="text-xs text-muted tabular-nums">{formatPhone(customer.phone)}</div>
      </div>
      <Button size="sm" className="min-h-11" onClick={() => router.replace(customerSearchRoute(customer.phone))}>
        Chọn khách này
      </Button>
    </div>
  );
}

type WalkInFormProps = {
  /** Số lễ tân vừa tìm, điền sẵn vào ô Số điện thoại. */
  initialPhone: string;
  onCancel: () => void;
};

/** SW-04 vùng 4 – Ghi nhận khách vãng lai (FR-ACC-04): khách không có tài khoản, không nhận thông báo trên web. */
export function WalkInForm({ initialPhone, onCancel }: WalkInFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const createWalkIn = useCreateWalkInCustomer();
  // Số bị backend báo trùng; còn giữ nguyên số đó thì khóa nút lưu, sửa số thì mở lại.
  const [duplicatePhone, setDuplicatePhone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<WalkInFormValues>({
    defaultValues: { fullName: "", phone: formatPhone(initialPhone) },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const phone = useWatch({ control, name: "phone" });
  const isDuplicate = duplicatePhone !== null && normalizePhone(phone) === duplicatePhone;

  const onSubmit = handleSubmit((values) => {
    const body = toWalkInRequest(values);
    createWalkIn.mutate(body, {
      onSuccess: ({ customerId }) => {
        setServingCustomer({ customerId, fullName: body.fullName, phone: body.phone, isWalkIn: true });
        showSuccess(`Đã ghi nhận khách vãng lai ${body.fullName}`);
        router.push(petCreateRoute(customerId));
      },
      onError: (error) => {
        if (toApiError(error).code === "DUPLICATE_CONTACT") {
          setDuplicatePhone(body.phone);
          setError("phone", { message: DUPLICATE_MESSAGE }, { shouldFocus: true });
        }
      },
    });
  });

  // 409 trùng số hiện dưới ô Số điện thoại; lỗi khác (400, mất mạng, 5xx) hiện ở đầu form.
  const generalError = createWalkIn.error && toApiError(createWalkIn.error).code !== "DUPLICATE_CONTACT" ? createWalkIn.error : null;

  return (
    <Card className="max-w-[720px]">
      <form noValidate onSubmit={onSubmit}>
        <CardHeader title="Ghi nhận khách vãng lai" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 max-[640px]:grid-cols-1">
          {generalError && <ErrorAlert error={generalError} className="col-span-2 max-[640px]:col-span-1" />}
          <Field id="walkin-name" label="Họ tên" required error={errors.fullName?.message}>
            {(fieldControl) => (
              <Input
                {...fieldControl}
                {...register("fullName", { validate: validateFullName })}
                autoComplete="off"
                maxLength={150}
              />
            )}
          </Field>
          <Field id="walkin-phone" label="Số điện thoại" required error={errors.phone?.message}>
            {(fieldControl) => (
              <Input
                {...fieldControl}
                {...register("phone", { validate: validatePhone })}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={20}
                className="tabular-nums"
              />
            )}
          </Field>
          <p className="col-span-2 text-xs text-muted max-[640px]:col-span-1">
            Khách vãng lai không có tài khoản đăng nhập và không nhận thông báo trên web. Lễ tân liên hệ khách qua số điện
            thoại này khi cần.
          </p>
          {isDuplicate && duplicatePhone && <DuplicateCustomer phone={duplicatePhone} />}
        </div>
        <CardFooter>
          <Button variant="ghost" className="min-h-11" onClick={onCancel}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="ml-auto min-h-11"
            loading={createWalkIn.isPending}
            disabled={isDuplicate}
          >
            Lưu và tạo hồ sơ thú cưng
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
