"use client";

// MW-05 vùng 7 – Cập nhật trạng thái (FR-EXE-05; BR-05) – UI-Screens.md. Quản lý chuyển lịch sang bước kế tiếp đúng vòng đời;
// backend kiểm tra trình tự, quyền và điều kiện, web chỉ hiện nút của bước kế tiếp kèm lý do khóa.
import Link from "next/link";
import { useForm } from "react-hook-form";
import { StatusBadge } from "@/components/domain/status-badge";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { AppointmentDetail } from "@/lib/api/types";
import { useAppointmentPhotos, useUpdateExecutionStatus, type ExecutionRequest } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { validateActualWeight, toWeightKg, type ActualWeightFormValues } from "../forms";
import { formatStoreDate } from "../schedule";
import {
  getErrorReason,
  getStatusUpdatePlan,
  getSuccessMessage,
  needsPaymentFirst,
  type StatusUpdatePlan,
} from "../status-update";
import { useMinuteClock } from "../use-minute-clock";

const REASON_ID = "status-update-reason";
const WEIGHT_FIELD_ID = "status-update-weight";

type StatusActionFormProps = { appointment: AppointmentDetail; plan: StatusUpdatePlan };

/** Lý do nút bị khóa (`.btn-reason` của ui-demo). */
function DisabledReason({ children }: { children: string }) {
  return (
    <p id={REASON_ID} className="mt-2 flex items-start gap-1.5 text-xs leading-4 text-muted">
      <Icon name="lock" className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** Giờ trả thực tế “06/10/2026 17:50” chỉ đọc: backend lấy giờ lúc nhận lời gọi (UI-Screens G-12). */
function ActualCheckOutField() {
  const now = useMinuteClock();
  const value = now === null ? "" : `${formatStoreDate(toStoreDate(new Date(now).toISOString()))} ${toStoreTime(new Date(now).toISOString())}`;

  return (
    <Field id="status-update-check-out" label="Giờ trả thực tế" hint="Hệ thống ghi giờ lúc bấm nút. Trả muộn có thể phát sinh phí trả muộn." className="mb-3">
      {(field) => <Input {...field} readOnly value={value} />}
    </Field>
  );
}

// Tách riêng để `key` theo bước làm mới ô nhập và lỗi cũ khi lịch sang bước khác (vd. sau khi đối chiếu cân nặng xong).
function StatusActionForm({ appointment, plan }: StatusActionFormProps) {
  const { showSuccess } = useToast();
  const update = useUpdateExecutionStatus();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActualWeightFormValues>({
    defaultValues: { actualWeightKg: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  function toRequest(values: ActualWeightFormValues): ExecutionRequest {
    const { appointmentId } = appointment;
    if (plan.action === "checkInSpa" || plan.action === "weightCheckHotel") {
      return { action: plan.action, appointmentId, actualWeightKg: toWeightKg(values.actualWeightKg) };
    }
    return { action: plan.action, appointmentId };
  }

  const submit = handleSubmit((values) => {
    update.mutate(toRequest(values), {
      onSuccess: (result) => showSuccess(getSuccessMessage(plan.action, appointment, result)),
    });
  });

  const error = update.error;
  const errorReason = error ? getErrorReason(plan.action, error) : null;
  const reason = plan.lockReason ?? errorReason;

  return (
    <form noValidate onSubmit={submit}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={plan.from} />
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <StatusBadge status={plan.to} />
      </div>

      {plan.needsWeight && (
        <Field
          id={WEIGHT_FIELD_ID}
          label="Cân nặng thực tế (kg)"
          required
          hint="Hệ thống đối chiếu với cân nặng trong hồ sơ thú cưng."
          error={errors.actualWeightKg?.message}
          className="mb-3"
        >
          {(field) => (
            <Input
              {...field}
              {...register("actualWeightKg", { validate: validateActualWeight })}
              suffix="kg"
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
            />
          )}
        </Field>
      )}

      {plan.action === "checkOut" && <ActualCheckOutField />}

      {error && !errorReason && <ErrorAlert error={error} className="mb-3" />}
      {error && needsPaymentFirst(error) && (
        <p className="mb-3 text-[13px]">
          <Link href={ROUTES.payments} className="font-semibold text-lagoon-700 underline">
            Mở Thanh toán để ghi nhận khoản còn thiếu
          </Link>
          , rồi quay lại bấm lại nút này.
        </p>
      )}

      {/* Giữ trạng thái đang gửi cả khi `update.isSuccess` cho tới lúc chi tiết mới về làm đổi `key={plan.action}` hoặc ẩn thẻ, tránh bấm lại bước cũ. */}
      <Button
        type="submit"
        variant="primary"
        block
        loading={update.isPending || update.isSuccess}
        disabled={plan.lockReason !== null}
        aria-describedby={reason ? REASON_ID : undefined}
      >
        {plan.label}
      </Button>
      {reason && <DisabledReason>{reason}</DisabledReason>}

      <p className="mt-3 text-xs leading-4 text-muted">
        Chỉ chuyển được sang bước kế tiếp đúng vòng đời. Thao tác được lưu tên người thực hiện.
      </p>
    </form>
  );
}

export function AppointmentStatusCard({ appointment }: { appointment: AppointmentDetail }) {
  // Ảnh Sau chỉ để biết có khóa nút Hoàn tất hay không; dùng chung khóa cache với vùng 4 nên không gọi API thêm.
  const photos = useAppointmentPhotos(appointment.appointmentId, {
    enabled: appointment.type === "Spa" && appointment.status === "InProgress",
    liveStatus: appointment.status,
  });
  const plan = getStatusUpdatePlan(appointment, photos.data);

  if (!plan) return null;

  return (
    <Card>
      <CardHeader title="Cập nhật trạng thái" />
      <CardBody>
        <StatusActionForm key={plan.action} appointment={appointment} plan={plan} />
      </CardBody>
    </Card>
  );
}
