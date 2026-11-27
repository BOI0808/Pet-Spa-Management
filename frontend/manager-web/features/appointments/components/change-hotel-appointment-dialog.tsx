"use client";

import { useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { Field, Input, Select } from "@/components/ui/field";
import { toApiError } from "@/lib/api/errors";
import type { AppointmentDetail, UpdateHotelAppointmentRequest } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useUpdateAppointment } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { getStoreToday, toStoreDate, toStoreIso, toStoreTime } from "@/lib/time";
import { ChangeDialogShell } from "./change-dialog-shell";

type ChangeHotelAppointmentDialogProps = {
  /** Lịch lưu trú Chờ xác nhận hoặc Đã xác nhận, có `plannedCheckIn` và `plannedCheckOut`. */
  appointment: AppointmentDetail;
  onClose: () => void;
  /** Gọi sau khi backend đã lưu; nơi gọi lo đóng hộp thoại. */
  onChanged: () => void;
};

type FormErrors = { checkInDate?: string; checkInTime?: string; checkOutDate?: string; checkOutTime?: string };

/**
 * MW-05·D2 Đổi lịch lưu trú – UI-Screens.md (UC-15, FR-CHG-03; BR-08, BR-21). Đổi ngày giờ nhận và trả; backend bắt buộc đủ
 * `plannedCheckIn`, `plannedCheckOut`, `petId` nên luôn gửi cả ba. Lịch Đã xác nhận còn chọn được chuồng khác cùng loài, nhóm (từ `GET /cages`);
 * không chọn thì không gửi `cageId` và backend giữ chuồng hiện tại. Lịch Chờ xác nhận chưa có chuồng (backend bỏ qua `cageId`) nên không hiện ô chọn.
 * Hết chuồng thì backend trả 409 NO_CAPACITY, trùng chuồng đã chọn trả 409 CAGE_CONFLICT.
 */
export function ChangeHotelAppointmentDialog({ appointment, onClose, onChanged }: ChangeHotelAppointmentDialogProps) {
  const { showSuccess, showError } = useToast();
  const update = useUpdateAppointment();

  // Chỉ lịch Đã xác nhận có chuồng để đổi; chưa tải được danh sách chuồng thì ẩn ô chọn và giữ chuồng hiện tại.
  const canChangeCage = appointment.status === "Confirmed" && Boolean(appointment.cageId);
  const cages = useCages({ enabled: canChangeCage }).data?.items ?? [];
  const currentCage = canChangeCage ? cages.find((item) => item.cageId === appointment.cageId) : undefined;
  const cageOptions = currentCage
    ? cages.filter(
        (item) =>
          item.isActive &&
          item.cageId !== currentCage.cageId &&
          item.species === currentCage.species &&
          item.sizeGroup === currentCage.sizeGroup,
      )
    : [];
  // Rỗng là giữ nguyên chuồng hiện tại.
  const [cageId, setCageId] = useState("");

  const current = {
    checkInDate: appointment.plannedCheckIn ? toStoreDate(appointment.plannedCheckIn) : "",
    checkInTime: appointment.plannedCheckIn ? toStoreTime(appointment.plannedCheckIn) : "",
    checkOutDate: appointment.plannedCheckOut ? toStoreDate(appointment.plannedCheckOut) : "",
    checkOutTime: appointment.plannedCheckOut ? toStoreTime(appointment.plannedCheckOut) : "",
  };
  const [values, setValues] = useState(current);
  const [errors, setErrors] = useState<FormErrors>({});

  const unchanged =
    values.checkInDate === current.checkInDate &&
    values.checkInTime === current.checkInTime &&
    values.checkOutDate === current.checkOutDate &&
    values.checkOutTime === current.checkOutTime &&
    cageId === "";

  function setValue(field: keyof typeof values, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate() {
    const next: FormErrors = {};
    if (!values.checkInDate) next.checkInDate = "Vui lòng chọn ngày nhận.";
    else if (values.checkInDate < getStoreToday()) next.checkInDate = "Không chọn ngày trong quá khứ.";
    if (!values.checkInTime) next.checkInTime = "Vui lòng chọn giờ nhận.";
    if (!values.checkOutDate) next.checkOutDate = "Vui lòng chọn ngày trả.";
    else if (values.checkInDate && values.checkOutDate <= values.checkInDate) {
      next.checkOutDate = "Ngày trả phải sau ngày nhận ít nhất 1 đêm.";
    }
    if (!values.checkOutTime) next.checkOutTime = "Vui lòng chọn giờ trả.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const body: UpdateHotelAppointmentRequest = {
      plannedCheckIn: toStoreIso(values.checkInDate, values.checkInTime),
      plannedCheckOut: toStoreIso(values.checkOutDate, values.checkOutTime),
      petId: appointment.petId,
      ...(cageId !== "" && { cageId }),
    };

    update.mutate(
      { appointmentId: appointment.appointmentId, body },
      {
        onSuccess: () => {
          showSuccess(`Đã đổi lịch ${formatAppointmentCode(appointment.appointmentId)}.`);
          onChanged();
        },
        // Lịch không còn đổi được: chi tiết được tải lại và hộp thoại biến mất cùng nút Đổi lịch, nên báo bằng toast.
        onError: (error) => {
          if (toApiError(error).code === "INVALID_TRANSITION") showError(error);
        },
      },
    );
  }

  return (
    <ChangeDialogShell
      title={`Đổi lịch lưu trú ${formatAppointmentCode(appointment.appointmentId)}`}
      subtitle="Dùng khi khách gọi hotline ngoài thời hạn tự đổi, hoặc cửa hàng cần điều chỉnh."
      icon="edit"
      error={update.error}
      loading={update.isPending}
      submitDisabled={unchanged}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        <Field id="change-hotel-checkin-date" label="Ngày nhận" required error={errors.checkInDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.checkInDate}
              min={getStoreToday()}
              disabled={update.isPending}
              onChange={(event) => setValue("checkInDate", event.target.value)}
            />
          )}
        </Field>
        <Field id="change-hotel-checkin-time" label="Giờ nhận" required error={errors.checkInTime}>
          {(control) => (
            <Input
              {...control}
              type="time"
              value={values.checkInTime}
              disabled={update.isPending}
              onChange={(event) => setValue("checkInTime", event.target.value)}
            />
          )}
        </Field>
        <Field id="change-hotel-checkout-date" label="Ngày trả" required error={errors.checkOutDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.checkOutDate}
              min={values.checkInDate || getStoreToday()}
              disabled={update.isPending}
              onChange={(event) => setValue("checkOutDate", event.target.value)}
            />
          )}
        </Field>
        <Field id="change-hotel-checkout-time" label="Giờ trả" required error={errors.checkOutTime}>
          {(control) => (
            <Input
              {...control}
              type="time"
              value={values.checkOutTime}
              disabled={update.isPending}
              onChange={(event) => setValue("checkOutTime", event.target.value)}
            />
          )}
        </Field>
      </div>
      {currentCage && (
        <Field id="change-hotel-cage" label="Chuồng">
          {(control) => (
            <Select {...control} value={cageId} disabled={update.isPending} onChange={(event) => setCageId(event.target.value)}>
              <option value="">Giữ nguyên ({currentCage.code})</option>
              {cageOptions.map((item) => (
                <option key={item.cageId} value={item.cageId}>
                  {item.occupant ? `${item.code} (đang chứa ${item.occupant.petName})` : item.code}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <p className="text-xs text-muted">
        Hệ thống kiểm tra lại chuồng trống và tính lại tiền lưu trú khi lưu.{" "}
        {currentCage ? "Không chọn chuồng khác thì chuồng hiện tại được giữ nguyên." : "Chuồng hiện tại được giữ nguyên."}
      </p>
    </ChangeDialogShell>
  );
}
