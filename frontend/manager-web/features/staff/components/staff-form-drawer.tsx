"use client";

import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/errors";
import type { StaffMember } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { useCreateStaff, useUpdateStaff } from "@/lib/queries/staff";
import { validateFullName, validatePassword, validatePhone } from "@/lib/validation";
import {
  DUPLICATE_PHONE_MESSAGE,
  STAFF_ROLE_OPTIONS,
  toStaffCreateRequest,
  toStaffFormValues,
  toStaffUpdateRequest,
  validateStaffRole,
  type StaffFormValues,
} from "../forms";

const FORM_ID = "staff-form";
const ROLE_ERROR_ID = "staff-role-error";
const DUPLICATE_CONTACT = "DUPLICATE_CONTACT";

type StaffFormDrawerProps = {
  /** Nhân viên đang sửa; `null` khi thêm mới. */
  staff: StaffMember | null;
  onCreated?: () => void;
  onClose: () => void;
};

/** MW-08·D1 Thêm / sửa nhân viên (ngăn kéo phải 520px) – UI-Screens.md. Chỉ render khi đang mở nên form luôn bắt đầu từ giá trị mới. */
export function StaffFormDrawer({ staff, onCreated, onClose }: StaffFormDrawerProps) {
  const { showSuccess } = useToast();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StaffFormValues>({
    defaultValues: toStaffFormValues(staff),
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const isPending = createStaff.isPending || updateStaff.isPending;
  const submitError = createStaff.error ?? updateStaff.error;

  // Trùng số điện thoại (409) báo ngay dưới ô Số điện thoại; mọi lỗi khác hiện ở alert đầu form.
  function handleError(error: ApiError) {
    if (error.code === DUPLICATE_CONTACT) {
      setError("userName", { message: DUPLICATE_PHONE_MESSAGE }, { shouldFocus: true });
    }
  }

  const handleSave = handleSubmit((values) => {
    if (staff) {
      const body = toStaffUpdateRequest(values);
      if (!body) return;
      updateStaff.mutate(
        { staffId: staff.staffId, body },
        {
          onSuccess: () => {
            showSuccess(`Đã lưu nhân viên ${body.fullName}`);
            onClose();
          },
        },
      );
      return;
    }

    const body = toStaffCreateRequest(values);
    if (!body) return;
    createStaff.mutate(body, {
      onSuccess: () => {
        showSuccess(`Đã tạo tài khoản cho ${body.fullName}`);
        onCreated?.();
        onClose();
      },
      onError: handleError,
    });
  });

  return (
    <Drawer
      title={staff ? `Sửa nhân viên: ${staff.fullName}` : "Thêm nhân viên"}
      narrow
      locked={isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={isPending}>
            {staff ? "Lưu thay đổi" : "Tạo tài khoản"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSave} className="flex flex-col gap-4">
        <ErrorAlert error={submitError?.code === DUPLICATE_CONTACT ? null : submitError} />

        <Field id="staff-full-name" label="Họ tên" required error={errors.fullName?.message}>
          {(control) => (
            <Input {...control} {...register("fullName", { validate: validateFullName })} autoComplete="off" />
          )}
        </Field>

        <Field
          id="staff-phone"
          label="Số điện thoại"
          required
          hint="Dùng làm tên đăng nhập."
          error={errors.userName?.message}
        >
          {(control) =>
            staff ? (
              // Sửa: số điện thoại không đổi (PUT /staff/{id} không nhận userName) nên chỉ hiển thị.
              <Input {...control} value={formatPhone(staff.userName)} disabled readOnly />
            ) : (
              <Input
                {...control}
                {...register("userName", { validate: validatePhone })}
                type="tel"
                inputMode="tel"
                autoComplete="off"
              />
            )
          }
        </Field>

        <fieldset className="min-w-0" aria-describedby={errors.staffRole ? ROLE_ERROR_ID : undefined}>
          <legend className="mb-1.5 text-[13px] font-semibold leading-[18px]">
            Vai trò<span className="ml-0.5 text-danger">*</span>
          </legend>
          <div className="flex flex-col gap-2">
            {STAFF_ROLE_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                value={option.value}
                showDot
                aria-invalid={errors.staffRole ? true : undefined}
                {...register("staffRole", { validate: validateStaffRole })}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{STAFF_ROLE_LABELS[option.value]}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </ChoiceCard>
            ))}
          </div>
          <FieldError id={ROLE_ERROR_ID} message={errors.staffRole?.message} />
        </fieldset>

        {!staff && (
          <Field
            id="staff-password"
            label="Mật khẩu ban đầu"
            required
            hint="Nhân viên dùng để đăng nhập web nhân viên lần đầu."
            error={errors.password?.message}
          >
            {(control) => (
              <Input
                {...control}
                {...register("password", { validate: validatePassword })}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>
        )}
      </form>
    </Drawer>
  );
}
