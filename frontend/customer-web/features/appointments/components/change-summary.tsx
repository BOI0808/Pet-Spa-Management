import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { SumTotal } from "@/components/domain/summary";
import { Alert } from "@/components/feedback/alert";
import { FieldError } from "@/components/feedback/field-error";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { DisabledReason } from "@/features/booking/components/disabled-reason";
import type { AppointmentDetail, Pet, Species } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";
import { describeCurrentAppointment, describePetOption } from "../change-appointment";

/** Vùng 2 – lịch hiện tại trên nền Mist (`.surface-soft`). */
export function CurrentAppointmentBox({
  appointment,
  petName,
  species,
}: {
  appointment: AppointmentDetail;
  petName: string;
  species: Species | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-mist px-4 py-3.5">
      <PetAvatar species={species} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted">Lịch hiện tại</div>
        <div className="break-words font-semibold">{describeCurrentAppointment(appointment, petName)}</div>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
  );
}

/** Ô chọn thú cưng (`.select` của ui-demo CW-10). */
export function PetSelect({
  pets,
  value,
  onChange,
  error,
}: {
  pets: Pet[];
  value: string | null;
  onChange: (petId: string) => void;
  error?: string;
}) {
  return (
    <Field id="change-pet" label="Thú cưng" error={error} className="max-w-[360px]">
      {(control) => (
        <Select {...control} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          {value === null && (
            <option value="" disabled>
              Chọn thú cưng
            </option>
          )}
          {pets.map((pet) => (
            <option key={pet.petId} value={pet.petId}>
              {describePetOption(pet)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

type ChangeSummaryProps = {
  isHotel: boolean;
  /** Các dòng `KeyValue` của lịch sau khi đổi. */
  children: ReactNode;
  totalLabel: string;
  amount: number | null;
  hasChanges: boolean;
  loading: boolean;
  onSubmit: () => void;
  appointmentId: string;
  /** Lỗi kiểm tra ở web khi bấm gửi. */
  validationMessage: string | null;
  /** Lý do khóa nút gửi, ngoài lý do “chưa có thay đổi”. */
  disabledReason?: string | null;
};

const NO_CHANGE_REASON = "Bạn chưa thay đổi gì so với lịch hiện tại.";

/** Vùng 5 – “Sau khi đổi”, dính bên phải khi cuộn. */
export function ChangeSummary({
  isHotel,
  children,
  totalLabel,
  amount,
  hasChanges,
  loading,
  onSubmit,
  appointmentId,
  validationMessage,
  disabledReason,
}: ChangeSummaryProps) {
  const reason = !hasChanges ? NO_CHANGE_REASON : (disabledReason ?? null);
  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardHeader title="Sau khi đổi" />
        <CardBody>
          {children}
          <SumTotal label={totalLabel} amount={amount} note="Tính lại khi cửa hàng duyệt" />
          <Alert tone="warn" className="mt-4 px-3! py-2.5! text-[13px] leading-[18px]">
            Lịch sẽ về <b>Chờ xác nhận</b> để cửa hàng duyệt lại nhân viên{isHotel ? " và chuồng" : ""}.
          </Alert>
        </CardBody>
        <CardFooter>
          <div className="flex w-full flex-col gap-2.5">
            <Button variant="primary" size="lg" block disabled={reason !== null} loading={loading} onClick={onSubmit}>
              Gửi yêu cầu đổi lịch
            </Button>
            {reason && <DisabledReason>{reason}</DisabledReason>}
            <FieldError message={validationMessage ?? undefined} />
            <ButtonLink href={ROUTES.appointmentDetail(appointmentId)} variant="ghost">
              Giữ lịch hiện tại
            </ButtonLink>
          </div>
        </CardFooter>
      </Card>
    </aside>
  );
}
