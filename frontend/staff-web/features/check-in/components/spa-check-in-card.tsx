"use client";

// SW-07 vùng 2 → 6 – thẻ tiếp nhận lịch spa (UI-Screens.md, FR-EXE-02, FR-EXE-10, UF-03).
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
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useCheckInSpa } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { ROUTES } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import { parseDecimal, validateActualWeightKg } from "@/lib/validation";
import { findPricing, formatSlotRange, serviceNames, staffNames } from "@/features/appointments/appointments";

/** Kết quả của lần tiếp nhận vừa làm, giữ ở màn cha để còn hiện sau khi chi tiết lịch tải lại (đã Đã tiếp nhận). */
export type CheckInOutcome = { appointmentId: string; actualWeightKg: number; weightCheck?: WeightCheck };

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
 * SW-07 vùng 5 sau khi gửi: câu theo kết quả đối chiếu. Cần khách xác nhận (tăng nhóm) chỉ hiện cảnh báo và hạn phản
 * hồi; đồng hồ đếm ngược và hộp “Ghi nhận phản hồi của khách” (vùng 7, SW-07·D1) làm ở thẻ 126.
 */
function WeightCheckAlert({
  outcome,
  appointment,
  pet,
}: {
  outcome: CheckInOutcome;
  appointment: AppointmentDetail;
  pet: Pet | null;
}) {
  const { weightCheck, actualWeightKg } = outcome;
  const weight = formatWeight(actualWeightKg);
  const staff = staffNames(appointment);
  const handOver = staff.length > 0 ? ` Lịch đã chuyển cho nhân viên spa ${staff.join(", ")}.` : "";
  const oldGroup = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const newGroup = weightCheck?.newSizeGroup ? SIZE_GROUP_LABELS[weightCheck.newSizeGroup] : oldGroup;
  const money = (amount?: number) => (amount === undefined ? "—" : formatMoney(amount));

  switch (weightCheck?.result) {
    case "PRICE_DECREASED":
      return (
        <Alert tone="info" title={`Cân nặng giảm, xuống nhóm ${newGroup}`}>
          Cân thực tế {weight}. Chi phí giảm từ {money(weightCheck.oldAmount)} xuống {money(weightCheck.newAmount)}.
          Khung giờ giữ nguyên.{handOver}
        </Alert>
      );
    case "NEEDS_CONFIRMATION":
      return (
        <Alert tone="warn" title={`Tăng nhóm kích cỡ: ${oldGroup} → ${newGroup}`}>
          Cân thực tế {weight}, vượt ngưỡng dung sai so với hồ sơ{pet ? ` (${formatWeight(pet.weightKg)})` : ""}. Chi
          phí tăng từ {money(weightCheck.oldAmount)} lên {money(weightCheck.newAmount)}. Đã gửi yêu cầu xác nhận cho
          khách
          {weightCheck.expiresAt ? `, hạn phản hồi ${toStoreTime(weightCheck.expiresAt)}` : ""}. Khách vãng lai không nhận
          thông báo trên web: hãy hỏi trực tiếp khách.
        </Alert>
      );
    default:
      // OK, hoặc backend không trả `weightCheck`: chi phí không đổi.
      return (
        <Alert tone="success" title="Trong ngưỡng dung sai, chi phí không đổi">
          Cân thực tế {weight}, vẫn thuộc nhóm {oldGroup}. Hồ sơ cập nhật cân nặng {weight}.{handOver}
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
      return "Lịch đã bị hủy.";
    default:
      return null;
  }
}

export function SpaCheckInCard({ appointment, pet, outcome, onCheckedIn, nextHref }: SpaCheckInCardProps) {
  const { showSuccess } = useToast();
  const checkIn = useCheckInSpa();
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
  const canSubmit = appointment.status === "Confirmed" && !justCheckedIn;
  const note = canSubmit || justCheckedIn ? null : statusNote(appointment);

  const submit = handleSubmit(({ actualWeightKg }) => {
    const weight = parseDecimal(actualWeightKg);
    if (weight === null) return;
    checkIn.mutate(
      { appointmentId: appointment.appointmentId, actualWeightKg: weight },
      {
        onSuccess: (result) => {
          showSuccess(`Đã tiếp nhận ${petName}`);
          onCheckedIn({ appointmentId: appointment.appointmentId, actualWeightKg: weight, weightCheck: result.weightCheck });
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
            {pet && `, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} ${pet.breed}`}
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

          {justCheckedIn && <WeightCheckAlert outcome={justCheckedIn} appointment={appointment} pet={pet} />}
          {/* Mở lại lịch đang chờ khách xác nhận chi phí: cảnh báo cơ bản; đếm ngược, ghi nhận phản hồi ở thẻ 126. */}
          {!justCheckedIn && appointment.pendingCostConfirmation?.status === "Pending" && (
            <Alert tone="warn" title="Đang chờ khách xác nhận chi phí mới">
              Chi phí mới {formatMoney(appointment.pendingCostConfirmation.newAmount)} (trước{" "}
              {formatMoney(appointment.pendingCostConfirmation.oldAmount)}), hạn phản hồi{" "}
              {toStoreTime(appointment.pendingCostConfirmation.expiresAt)}.
            </Alert>
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
          {justCheckedIn && nextHref && (
            <ButtonLink href={nextHref} replace className="ml-auto">
              Tiếp nhận lịch tiếp theo
            </ButtonLink>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
