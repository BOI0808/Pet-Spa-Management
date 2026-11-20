"use client";

// SW-07 vùng 2 → 6 – thẻ tiếp nhận lịch spa (UI-Screens.md, FR-EXE-02, FR-EXE-10, UF-03).
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, Pet, WeightCheck } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney, formatWeight } from "@/lib/format";
import { CANCEL_REASON_LABELS, SIZE_GROUP_LABELS } from "@/lib/labels";
import { useCheckInSpa } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { ROUTES } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import { parseDecimal, validateActualWeightKg } from "@/lib/validation";
import {
  findPricing,
  formatSlotRange,
  serviceNames,
  speciesAndBreed,
  staffNames,
} from "@/features/appointments/appointments";
import {
  CostConfirmationAlert,
  RecordResponseDialog,
  usePendingCostConfirmation,
  weightDifference,
} from "./cost-confirmation";

/** “Chó Poodle” → “chó Poodle” cho tiêu đề “Bông, chó Poodle” như ui-demo. */
function lowerFirst(text: string) {
  return text.charAt(0).toLocaleLowerCase("vi-VN") + text.slice(1);
}

/** Kết quả của lần tiếp nhận vừa làm, giữ ở màn cha để còn hiện sau khi chi tiết lịch tải lại (đã Đã tiếp nhận). */
export type CheckInOutcome = {
  appointmentId: string;
  actualWeightKg: number;
  /** Cân khai báo lúc gửi; lưu lại vì sau khi tiếp nhận hồ sơ có thể đã cập nhật sang cân thực tế. */
  declaredWeightKg: number | null;
  weightCheck?: WeightCheck;
};

type SpaCheckInCardProps = {
  appointment: AppointmentDetail;
  pet: Pet | null;
  outcome: CheckInOutcome | null;
  onCheckedIn: (outcome: CheckInOutcome) => void;
  /** Lịch spa Đã xác nhận kế tiếp trong ngày, cho nút “Tiếp nhận lịch tiếp theo”. */
  nextHref: string | null;
};

function InfoBox({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
      {note && <div className="break-words text-xs text-muted">{note}</div>}
    </div>
  );
}

/**
 * SW-07 vùng 5 sau khi gửi: câu theo kết quả đối chiếu. Cần khách xác nhận (tăng nhóm) thì thẻ hiện vùng 7
 * (`CostConfirmationAlert`) từ yêu cầu đang chờ của chi tiết lịch; nhánh NEEDS_CONFIRMATION dưới đây chỉ hiện trong
 * lúc chi tiết lịch chưa tải lại xong.
 */
function WeightCheckAlert({ outcome, appointment }: { outcome: CheckInOutcome; appointment: AppointmentDetail }) {
  const { weightCheck, actualWeightKg } = outcome;
  const weight = formatWeight(actualWeightKg);
  // “Chênh 0,8 kg” như ui-demo SW-07.
  const differenceKg = weightDifference(actualWeightKg, outcome.declaredWeightKg);
  const difference = differenceKg ? ` (chênh ${differenceKg})` : "";
  const staff = staffNames(appointment);
  const handOver = staff.length > 0 ? ` Lịch đã chuyển cho nhân viên spa ${staff.join(", ")}.` : "";
  const oldGroup = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const newGroup = weightCheck?.newSizeGroup ? SIZE_GROUP_LABELS[weightCheck.newSizeGroup] : oldGroup;
  const money = (amount?: number) => (amount === undefined ? "—" : formatMoney(amount));

  switch (weightCheck?.result) {
    case "PRICE_DECREASED":
      return (
        <Alert tone="info" title={`Cân nặng giảm, xuống nhóm ${newGroup}`}>
          Cân thực tế {weight}{difference}. Chi phí giảm từ {money(weightCheck.oldAmount)} xuống {money(weightCheck.newAmount)}.
          Khung giờ giữ nguyên.{handOver}
        </Alert>
      );
    case "NEEDS_CONFIRMATION":
      // Đã ghi nhận phản hồi ở SW-07·D1: từ chối → lịch hủy (câu ở `statusNote`); đồng ý → lịch đổi sang nhóm mới.
      if (appointment.status === "Cancelled") return null;
      if (weightCheck.newSizeGroup && appointment.sizeGroup === weightCheck.newSizeGroup) {
        return (
          <Alert tone="success" title="Khách đã đồng ý chi phí mới">
            Lịch tiếp tục theo nhóm {newGroup}, chi phí {money(weightCheck.newAmount)}. Hồ sơ cập nhật cân nặng {weight}.
            {handOver}
          </Alert>
        );
      }
      return (
        <Alert tone="warn" title={`Tăng nhóm kích cỡ: ${oldGroup} → ${newGroup}`}>
          Cân thực tế {weight}{difference}, vượt ngưỡng dung sai so với hồ sơ. Chi
          phí tăng từ {money(weightCheck.oldAmount)} lên {money(weightCheck.newAmount)}. Đã gửi yêu cầu xác nhận cho
          khách{weightCheck.expiresAt ? `, hạn phản hồi ${toStoreTime(weightCheck.expiresAt)}` : ""}.
        </Alert>
      );
    default:
      // OK, hoặc backend không trả `weightCheck`: chi phí không đổi.
      return (
        <Alert tone="success" title="Trong ngưỡng dung sai, chi phí không đổi">
          Cân thực tế {weight}{difference}, vẫn thuộc nhóm {oldGroup}. Hồ sơ cập nhật cân nặng {weight}.{handOver}
        </Alert>
      );
  }
}

/** Câu cho lịch không ở trạng thái tiếp nhận được (mở lại lịch đã tiếp nhận, lịch chưa xác nhận, đã hủy…). */
function statusNote(appointment: AppointmentDetail) {
  switch (appointment.status) {
    case "Pending":
      return "Lịch chưa được quản lý xác nhận nên chưa tiếp nhận được.";
    case "Received":
    case "InProgress":
    case "Completed":
      return appointment.actualWeightKg != null
        ? `Đã tiếp nhận, cân thực tế ${formatWeight(appointment.actualWeightKg)}.`
        : "Lịch đã được tiếp nhận.";
    case "Cancelled":
      return appointment.cancelReason
        ? `Lịch đã bị hủy, lý do ${CANCEL_REASON_LABELS[appointment.cancelReason]}.`
        : "Lịch đã bị hủy.";
    default:
      return null;
  }
}

export function SpaCheckInCard({ appointment, pet, outcome, onCheckedIn, nextHref }: SpaCheckInCardProps) {
  const { showSuccess } = useToast();
  const checkIn = useCheckInSpa();
  const { pending, overdue } = usePendingCostConfirmation(appointment);
  const [responseOpen, setResponseOpen] = useState(false);
  const services = useServices(pet ? { species: pet.species, sizeGroup: appointment.sizeGroup } : {}, {
    enabled: pet !== null,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ actualWeightKg: string }>({
    defaultValues: { actualWeightKg: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const petName = appointment.petName ?? pet?.name ?? "Thú cưng";
  const staff = staffNames(appointment);
  const names = serviceNames(appointment);
  // Tạm tính = cộng giá từng dịch vụ theo nhóm của lịch (G-05: chi tiết lịch chưa có số tiền).
  const prices = (appointment.services ?? []).map((service) =>
    pet ? findPricing(services.data, service.serviceId, pet.species, appointment.sizeGroup)?.price : undefined,
  );
  const estimate = prices.length > 0 && prices.every((price) => price !== undefined)
    ? prices.reduce<number>((sum, price) => sum + (price ?? 0), 0)
    : null;

  const justCheckedIn = outcome?.appointmentId === appointment.appointmentId ? outcome : null;
  // Vừa gửi xong nhưng chi tiết lịch chưa tải lại (còn Đã xác nhận): chưa mời sang lịch tiếp theo, vì có thể lịch đang
  // chờ khách xác nhận chi phí và nút “Ghi nhận phản hồi của khách” sẽ hiện thay.
  const reloadingAfterCheckIn = justCheckedIn !== null && appointment.status === "Confirmed";
  const canSubmit = appointment.status === "Confirmed" && !justCheckedIn;
  // Vừa tiếp nhận thì câu kết quả đã nói đủ; riêng lịch vừa bị hủy (khách từ chối chi phí mới) vẫn cần câu trạng thái.
  const note = canSubmit || (justCheckedIn && appointment.status !== "Cancelled") ? null : statusNote(appointment);

  const submit = handleSubmit(({ actualWeightKg }) => {
    const weight = parseDecimal(actualWeightKg);
    if (weight === null) return;
    checkIn.mutate(
      { appointmentId: appointment.appointmentId, actualWeightKg: weight },
      {
        onSuccess: (result) => {
          showSuccess(`Đã tiếp nhận ${petName}`);
          onCheckedIn({
            appointmentId: appointment.appointmentId,
            actualWeightKg: weight,
            declaredWeightKg: pet?.weightKg ?? null,
            weightCheck: result.weightCheck,
          });
        },
      },
    );
  });

  return (
    <Card>
      {/* Vùng 2 – đầu thẻ. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4">
        {pet ? <PetAvatar species={pet.species} size="lg" /> : <Skeleton className="size-[72px] rounded-[22px]" />}
        <div className="min-w-0 flex-1 basis-[220px]">
          <h2 className="break-words">
            {petName}
            {pet && `, ${lowerFirst(speciesAndBreed(pet))}`}
          </h2>
          <p className="text-[13px] text-muted">
            {formatAppointmentCode(appointment.appointmentId)}. Spa {formatSlotRange(appointment)}.
            {staff.length > 0 && ` Nhân viên phụ trách: ${staff.join(", ")}.`}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <form noValidate onSubmit={submit}>
        <CardBody className="flex flex-col gap-4">
          {/* Vùng 3 – thông tin đối chiếu. Số điện thoại khách chưa có trong lịch hẹn (G-05). */}
          <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
            <InfoBox label="Khách hàng" value={appointment.customerName ?? "—"} />
            <InfoBox
              label="Cân nặng khai báo"
              value={pet ? `${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}` : "—"}
              note={pet?.heightCm ? `Chiều cao ${pet.heightCm} cm giữ theo hồ sơ` : undefined}
            />
            <InfoBox
              label="Dịch vụ"
              value={names.join(", ") || "—"}
              note={estimate !== null ? `Tạm tính ${formatMoney(estimate)}` : undefined}
            />
          </div>

          {/* Lỗi từ API: 409 INVALID_TRANSITION (quá giờ giữ chỗ, đã bị hủy, đã tiếp nhận) – hook đã tải lại danh sách. */}
          {checkIn.error && checkIn.variables?.appointmentId === appointment.appointmentId && (
            <ErrorAlert error={checkIn.error} />
          )}

          {canSubmit && (
            // Vùng 4, 5 – nhập cân nặng thực tế; hệ thống đối chiếu khi xác nhận. Giờ giữ chỗ cần cấu hình (G-03) nên ẩn.
            <div className="flex flex-wrap items-start gap-4">
              <Field
                id="actual-weight"
                label="Cân nặng thực tế (kg)"
                required
                error={errors.actualWeightKg?.message}
                className="w-[260px] max-[640px]:w-full"
              >
                {(control) => (
                  <Input
                    {...control}
                    {...register("actualWeightKg", { validate: validateActualWeightKg })}
                    inputMode="decimal"
                    suffix="kg"
                    autoComplete="off"
                    className="h-[52px]! text-xl! font-bold tabular-nums"
                  />
                )}
              </Field>
              <div className="min-w-0 flex-1 basis-[240px]">
                <div className="mb-1.5 text-[13px] font-semibold">Kết quả đối chiếu</div>
                <div className="flex min-h-[52px] items-center rounded-xl bg-mist px-4 text-[13px] text-muted">
                  Hệ thống đối chiếu với hồ sơ ngay khi bạn xác nhận tiếp nhận.
                </div>
              </div>
            </div>
          )}

          {/* Vùng 7 – đang chờ khách xác nhận chi phí: vừa tiếp nhận xong, hoặc mở lại lịch đang chờ. */}
          {pending ? (
            <CostConfirmationAlert
              appointment={appointment}
              pending={pending}
              // Khi đang chờ, hồ sơ chưa đổi; vừa tiếp nhận thì dùng cân khai báo đã lưu lúc gửi.
              declaredWeightKg={justCheckedIn?.declaredWeightKg ?? pet?.weightKg ?? null}
              overdue={overdue}
            />
          ) : (
            justCheckedIn && <WeightCheckAlert outcome={justCheckedIn} appointment={appointment} />
          )}
          {note && <Alert tone="neutral">{note}</Alert>}
        </CardBody>

        {/* Vùng 6 – chân thẻ. */}
        <CardFooter className="flex flex-wrap gap-2.5">
          <ButtonLink href={ROUTES.appointments} variant="ghost">
            Quay lại lịch hẹn
          </ButtonLink>
          {canSubmit && (
            <Button type="submit" variant="primary" className="ml-auto" loading={checkIn.isPending}>
              Xác nhận tiếp nhận
            </Button>
          )}
          {pending && appointment.status === "Received" && (
            <Button className="ml-auto" onClick={() => setResponseOpen(true)}>
              Ghi nhận phản hồi của khách
            </Button>
          )}
          {justCheckedIn && !pending && !reloadingAfterCheckIn && nextHref && (
            <ButtonLink href={nextHref} replace className="ml-auto">
              Tiếp nhận lịch tiếp theo
            </ButtonLink>
          )}
        </CardFooter>
      </form>
      {pending && (
        <RecordResponseDialog
          open={responseOpen}
          onClose={() => setResponseOpen(false)}
          appointment={appointment}
          pending={pending}
          petName={petName}
          overdue={overdue}
        />
      )}
    </Card>
  );
}
