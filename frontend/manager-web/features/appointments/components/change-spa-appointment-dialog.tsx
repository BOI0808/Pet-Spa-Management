"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Field, Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, UpdateSpaAppointmentRequest } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useUpdateAppointment } from "@/lib/queries/appointments";
import { useStaff } from "@/lib/queries/staff";
import { getStoreToday, toStoreDate, toStoreIso, toStoreTime } from "@/lib/time";
import { SLOT_TIME_OPTIONS } from "@/features/services/forms";
import { OutOfShiftDialog } from "@/features/pending/components/out-of-shift-dialog";
import { StaffOption } from "@/features/pending/components/staff-option";
import { toggleStaff } from "@/features/pending/spa-assignment";
import { ChangeDialogShell } from "./change-dialog-shell";

type ChangeSpaAppointmentDialogProps = {
  /** Lịch spa Chờ xác nhận hoặc Đã xác nhận, có `slotStart` và `services`. */
  appointment: AppointmentDetail;
  onClose: () => void;
  /** Gọi sau khi backend đã lưu; nơi gọi lo đóng hộp thoại. */
  onChanged: () => void;
};

function isSameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * MW-05·D1 Đổi lịch spa – UI-Screens.md (UC-15, FR-CHG-03; BR-08, BR-13, BR-21). Đổi ngày, mốc giờ và (lịch Đã xác nhận) nhân viên.
 * Backend bắt buộc đủ `slotStart`, `petId`, `serviceIds` nên luôn gửi lại thú cưng và dịch vụ hiện tại; chỉ gửi `staffIds` khi Quản lý đổi người.
 * Chưa có chọn mốc giờ theo chỗ trống vì GET /spa/slots không dành cho Quản lý: dùng các mốc mặc định, backend kiểm tra còn chỗ khi lưu (409 SLOT_FULL).
 */
export function ChangeSpaAppointmentDialog({ appointment, onClose, onChanged }: ChangeSpaAppointmentDialogProps) {
  const { showSuccess, showError } = useToast();
  const update = useUpdateAppointment();
  const staffQuery = useStaff();

  const currentSlot = appointment.slotStart ?? "";
  const currentDate = currentSlot ? toStoreDate(currentSlot) : "";
  const currentTime = currentSlot ? toStoreTime(currentSlot) : "";
  const timeOptions = SLOT_TIME_OPTIONS.includes(currentTime) ? SLOT_TIME_OPTIONS : [currentTime, ...SLOT_TIME_OPTIONS];

  const isConfirmed = appointment.status === "Confirmed";
  const currentStaffIds = (appointment.staff ?? []).filter((member) => member.isHolding).map((member) => member.staffId);
  const staffRequired = appointment.staffRequired ?? Math.max(currentStaffIds.length, 1);
  const candidates = (staffQuery.data?.items ?? []).filter((member) => member.staffRole === "SpaStaff" && member.isActive);
  const staffReady = isConfirmed && staffQuery.isSuccess;

  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState(currentTime);
  // Chỉ giữ những người hiện tại còn trong danh sách nhân viên spa đang hoạt động; người đã ngừng hoạt động phải được thay.
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [errors, setErrors] = useState<{ date?: string; time?: string; staff?: string }>({});
  // Có giá trị khi backend báo 409 STAFF_OUT_OF_SHIFT: hỏi lại Quản lý (MW-04·D2) rồi gửi lại kèm `confirmOutOfShift`.
  const [outOfShift, setOutOfShift] = useState<{ detail: string | null } | null>(null);

  const effectiveStaffIds = selectedIds ?? currentStaffIds.filter((id) => candidates.some((member) => member.staffId === id));
  const staffChanged = staffReady && !isSameSet(effectiveStaffIds, currentStaffIds);
  const unchanged = date === currentDate && time === currentTime && !staffChanged;
  // Lỗi ngoài ca đã có hộp thoại riêng nên không lặp lại trong thân hộp thoại.
  const saveError = update.error && toApiError(update.error).code === "STAFF_OUT_OF_SHIFT" ? null : update.error;

  function validate() {
    const next: { date?: string; time?: string; staff?: string } = {};
    if (!date) next.date = "Vui lòng chọn ngày.";
    else if (date < getStoreToday()) next.date = "Không chọn ngày trong quá khứ.";
    if (!time) next.time = "Vui lòng chọn mốc giờ.";
    if (!next.date && !next.time && new Date(toStoreIso(date, time)).getTime() <= Date.now()) {
      next.time = "Khung giờ mới phải ở tương lai.";
    }
    if (staffChanged && effectiveStaffIds.length !== staffRequired) {
      next.staff = `Lịch này cần đúng ${staffRequired} nhân viên.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(confirmOutOfShift: boolean) {
    if (!confirmOutOfShift && !validate()) return;
    const serviceIds = (appointment.services ?? []).map((service) => service.serviceId);
    const body: UpdateSpaAppointmentRequest = {
      slotStart: toStoreIso(date, time),
      petId: appointment.petId,
      serviceIds,
      ...(staffChanged ? { staffIds: effectiveStaffIds } : {}),
      ...(confirmOutOfShift ? { confirmOutOfShift: true as const } : {}),
    };

    update.mutate(
      { appointmentId: appointment.appointmentId, body },
      {
        onSuccess: () => {
          setOutOfShift(null);
          showSuccess(`Đã đổi lịch ${formatAppointmentCode(appointment.appointmentId)}.`);
          onChanged();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          // Người ngoài ca: hỏi lại Quản lý. Gửi lại kèm `confirmOutOfShift` mà vẫn lỗi thì đóng hộp thoại hỏi, lỗi hiện trong hộp thoại đổi lịch.
          setOutOfShift(apiError.code === "STAFF_OUT_OF_SHIFT" && !confirmOutOfShift ? { detail: apiError.detail } : null);
          // Lịch không còn đổi được: chi tiết được tải lại và hộp thoại biến mất cùng nút Đổi lịch, nên báo bằng toast.
          if (apiError.code === "INVALID_TRANSITION") showError(error);
        },
      },
    );
  }

  return (
    <>
      <ChangeDialogShell
        title={`Đổi lịch spa ${formatAppointmentCode(appointment.appointmentId)}`}
        subtitle="Dùng khi khách gọi hotline ngoài thời hạn tự đổi, hoặc cửa hàng cần điều chỉnh."
        icon="edit"
        error={saveError}
        loading={update.isPending}
        submitDisabled={unchanged}
        onSubmit={() => submit(false)}
        onClose={onClose}
      >
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <Field id="change-spa-date" label="Ngày" required error={errors.date}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={date}
                min={getStoreToday()}
                disabled={update.isPending}
                onChange={(event) => setDate(event.target.value)}
              />
            )}
          </Field>
          <Field id="change-spa-time" label="Mốc giờ" required error={errors.time}>
            {(control) => (
              <Select {...control} value={time} disabled={update.isPending} onChange={(event) => setTime(event.target.value)}>
                {timeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === currentTime ? `${option} (giữ nguyên)` : option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {isConfirmed && (
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <legend className="mb-1.5 text-[13px] font-semibold leading-[18px] text-ink">
              Nhân viên spa{staffRequired > 1 ? ` (chọn ${staffRequired} người)` : ""}
            </legend>
            {staffQuery.isPending ? (
              <Skeleton className="h-[62px] rounded-xl" />
            ) : staffQuery.isError ? (
              <ErrorAlert error={staffQuery.error} />
            ) : (
              candidates.map((member) => (
                <StaffOption
                  key={member.staffId}
                  staff={{ staffId: member.staffId, fullName: member.fullName }}
                  mode={staffRequired === 1 ? "radio" : "checkbox"}
                  name="change-spa-staff"
                  checked={effectiveStaffIds.includes(member.staffId)}
                  suggested={false}
                  disabled={
                    update.isPending ||
                    (staffRequired > 1 && effectiveStaffIds.length >= staffRequired && !effectiveStaffIds.includes(member.staffId))
                  }
                  onChange={() => {
                    update.reset();
                    setErrors((current) => ({ ...current, staff: undefined }));
                    setSelectedIds(toggleStaff(effectiveStaffIds, member.staffId, staffRequired));
                  }}
                />
              ))
            )}
            {errors.staff && (
              <p role="alert" className="text-xs text-danger">
                {errors.staff}
              </p>
            )}
          </fieldset>
        )}

        <p className="text-xs text-muted">
          Hệ thống kiểm tra lại mốc giờ còn chỗ và lịch của nhân viên khi lưu.
          {!isConfirmed && " Lịch đang Chờ xác nhận: nhân viên được chọn khi xác nhận lịch."}
        </p>
      </ChangeDialogShell>

      {outOfShift && (
        <OutOfShiftDialog
          detail={outOfShift.detail}
          loading={update.isPending}
          onConfirm={() => submit(true)}
          onClose={() => setOutOfShift(null)}
        />
      )}
    </>
  );
}
