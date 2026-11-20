"use client";

// SW-07 vùng 8 → 11 – thẻ tiếp nhận lịch lưu trú (UI-Screens.md, FR-EXE-10, FR-EXE-11, UF-03, UF-10).
// Thẻ 126 làm bước 1 “Đối chiếu cân nặng”; bước 2 “Thu tiền lưu trú” (SW-09, thẻ 128) và bước 3 “Đưa bé vào chuồng”
// (`POST /appointments/{id}/check-in` không body, thẻ 127) mới hiện trạng thái, chưa có thao tác.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceTask } from "@/components/domain/service-task";
import { PaymentBadge, StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { AppointmentDetail, Pet, WeightCheck } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth, formatMoney, formatWeight } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, CANCEL_REASON_LABELS, SIZE_GROUP_LABELS } from "@/lib/labels";
import { useAppointmentPayments, useWeightCheckHotel } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { parseDecimal, validateActualWeightKg } from "@/lib/validation";
import { findPayment, speciesAndBreed } from "@/features/appointments/appointments";
import {
  CostConfirmationAlert,
  RecordResponseDialog,
  usePendingCostConfirmation,
  weightDifference,
} from "./cost-confirmation";

/** “06/10 10:00” – mốc nhận, trả trên đầu thẻ (ui-demo SW-07). */
function formatStayMoment(isoDateTime: string) {
  return `${formatDayMonth(toStoreDate(isoDateTime))} ${toStoreTime(isoDateTime)}`;
}

/** “Cốm, thỏ Hà Lan”. */
function lowerFirst(text: string) {
  return text.charAt(0).toLocaleLowerCase("vi-VN") + text.slice(1);
}

/** Kết quả lần đối chiếu vừa làm ở màn này; mở lại lịch thì chỉ còn `actualWeightKg` trong chi tiết lịch. */
type WeighOutcome = {
  actualWeightKg: number;
  /** Cân khai báo lúc gửi, vì sau khi đối chiếu (OK, giảm nhóm) hồ sơ đã cập nhật sang cân thực tế. */
  declaredWeightKg: number | null;
  weightCheck: WeightCheck;
};

type HotelCheckInCardProps = {
  appointment: AppointmentDetail;
  pet: Pet | null;
};

/** Câu giải thích dưới dòng “Ghi nhận cân nặng thực tế” (vùng 9, đã làm). */
function weighedDetail(appointment: AppointmentDetail, outcome: WeighOutcome | null, accepted: boolean, cageCode: string) {
  const group = SIZE_GROUP_LABELS[appointment.sizeGroup];
  if (accepted) return `Khách đã đồng ý chi phí mới, lịch theo nhóm ${group}.`;
  if (!outcome) return `Nhóm kích cỡ của lịch: ${group}.`;
  const { weightCheck } = outcome;
  const declared = outcome.declaredWeightKg === null ? "" : `Khai báo ${formatWeight(outcome.declaredWeightKg)}. `;
  const differenceKg = weightDifference(outcome.actualWeightKg, outcome.declaredWeightKg);
  const difference = differenceKg ? `Chênh ${differenceKg}, ` : "";
  if (weightCheck.result === "PRICE_DECREASED") {
    const newGroup = weightCheck.newSizeGroup ? SIZE_GROUP_LABELS[weightCheck.newSizeGroup] : group;
    const money =
      weightCheck.oldAmount !== undefined && weightCheck.newAmount !== undefined
        ? ` Tiền lưu trú giảm từ ${formatMoney(weightCheck.oldAmount)} xuống ${formatMoney(weightCheck.newAmount)}.`
        : "";
    const cage = weightCheck.cageSuitable === true && cageCode ? ` Chuồng ${cageCode} vẫn phù hợp.` : "";
    return `${declared}${difference}cân nặng giảm, xuống nhóm ${newGroup}.${money}${cage}`;
  }
  return `${declared}${difference}vẫn thuộc nhóm ${group}. Chi phí không đổi.`;
}

/**
 * Lý do nút “Xác nhận tiếp nhận” bị khóa (vùng 11, Đề xuất). Khi đang chờ khách, chân thẻ hiện nút “Ghi nhận phản hồi
 * của khách” thay cho nút này. Thẻ 127 bật nút khi đã thu tiền lưu trú.
 */
function lockReason(weighed: boolean) {
  return weighed ? "Cần thu tiền lưu trú trước khi tiếp nhận." : "Cần đối chiếu cân nặng trước.";
}

export function HotelCheckInCard({ appointment, pet }: HotelCheckInCardProps) {
  const { showSuccess } = useToast();
  const weighCheck = useWeightCheckHotel();
  const cages = useCages();
  const payments = useAppointmentPayments(appointment.appointmentId);
  const { pending, overdue } = usePendingCostConfirmation(appointment);
  const [outcome, setOutcome] = useState<WeighOutcome | null>(null);
  const [responseOpen, setResponseOpen] = useState(false);
  /** Khách vừa đồng ý chi phí mới ở SW-07·D1; `cageSuitable` từ phản hồi của API. */
  const [accepted, setAccepted] = useState<{ cageSuitable?: boolean } | null>(null);
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
  const cageCode =
    (appointment.cageId && cages.data?.items.find((cage) => cage.cageId === appointment.cageId)?.code) ?? "";
  const stay =
    appointment.plannedCheckIn && appointment.plannedCheckOut
      ? ` Lưu trú ${formatStayMoment(appointment.plannedCheckIn)} → ${formatStayMoment(appointment.plannedCheckOut)}.`
      : "";
  const stayPayment = findPayment(payments.data, "Stay");

  const isConfirmed = appointment.status === "Confirmed";
  // Đang chờ khách: backend đã ghi `actualWeightKg` nhưng chưa đổi nhóm, nên phải xét `pending` trước.
  const weighed = !pending && appointment.actualWeightKg != null;
  // Vừa gửi đối chiếu nhưng chi tiết lịch chưa tải lại: chưa hiện lại ô cân nặng, để lễ tân không gửi lần nữa và nhận
  // 409 COST_CONFIRMATION_PENDING (review PR #75; thẻ spa có `reloadingAfterCheckIn` tương tự).
  const reloadingAfterWeigh = outcome !== null && !pending && !weighed;
  const canWeigh = isConfirmed && !pending && !weighed && !reloadingAfterWeigh;
  // Khách đã đồng ý chi phí mới ở nơi khác (Web Khách hàng) sau khi màn này nhận NEEDS_CONFIRMATION: yêu cầu không
  // còn chờ và lịch đã sang nhóm mới – cùng cách nhận biết với thẻ spa (review PR #75).
  const acceptedElsewhere =
    accepted === null &&
    !pending &&
    outcome?.weightCheck.result === "NEEDS_CONFIRMATION" &&
    outcome.weightCheck.newSizeGroup === appointment.sizeGroup;
  // Chuồng không còn phù hợp nhóm mới (BR-21): sau khi giảm nhóm, hoặc khách đồng ý tăng nhóm ở D1.
  const cageUnsuitable =
    (outcome?.weightCheck.result === "PRICE_DECREASED" && outcome.weightCheck.cageSuitable === false) ||
    accepted?.cageSuitable === false;

  const submit = handleSubmit(({ actualWeightKg }) => {
    const weight = parseDecimal(actualWeightKg);
    if (weight === null) return;
    weighCheck.mutate(
      { appointmentId: appointment.appointmentId, actualWeightKg: weight },
      {
        onSuccess: ({ weightCheck }) => {
          showSuccess(`Đã ghi nhận cân nặng thực tế của ${petName}`);
          setOutcome({ actualWeightKg: weight, declaredWeightKg: pet?.weightKg ?? null, weightCheck });
        },
      },
    );
  });

  let statusNote: string | null = null;
  if (appointment.status === "Cancelled") {
    statusNote = appointment.cancelReason
      ? `Lịch đã bị hủy, lý do ${CANCEL_REASON_LABELS[appointment.cancelReason]}.`
      : "Lịch đã bị hủy.";
  } else if (!isConfirmed) {
    statusNote = `Lịch đang ở trạng thái ${APPOINTMENT_STATUS_LABELS[appointment.status]}, không ở bước tiếp nhận.`;
  }

  return (
    <Card>
      {/* Vùng 8 – đầu thẻ. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4">
        {pet ? <PetAvatar species={pet.species} size="lg" /> : <Skeleton className="size-[72px] rounded-[22px]" />}
        <div className="min-w-0 flex-1 basis-[220px]">
          <h2 className="break-words">
            {petName}
            {pet && `, ${lowerFirst(speciesAndBreed(pet))}`}
          </h2>
          <p className="text-[13px] text-muted">
            {formatAppointmentCode(appointment.appointmentId)}.{stay}
            {cageCode && ` Chuồng ${cageCode}`}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <form noValidate onSubmit={submit}>
        <CardBody className="flex flex-col gap-4">
          {/* Dải khách hàng. Số điện thoại, thẻ “Khách vãng lai” chưa có trong lịch hẹn (G-05). */}
          <div className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3">
            <Icon name="user" className="size-[18px] text-muted" />
            <b className="min-w-0 break-words">{appointment.customerName ?? "—"}</b>
          </div>

          {statusNote ? (
            <Alert tone="neutral">{statusNote}</Alert>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {/* Vùng 9 – bước 1: đối chiếu cân nặng. */}
              {weighed ? (
                <ServiceTask
                  done
                  name={`Ghi nhận cân nặng thực tế: ${formatWeight(appointment.actualWeightKg ?? 0)}`}
                  detail={weighedDetail(appointment, outcome, accepted !== null || acceptedElsewhere, cageCode)}
                  aside={<Tag tone="ok">Đã đối chiếu</Tag>}
                />
              ) : (
                <li className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                  <div>
                    <div className="font-semibold">Bước 1. Đối chiếu cân nặng</div>
                    <div className="text-xs text-muted">
                      {pet
                        ? `Khai báo ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}.`
                        : `Nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}.`}{" "}
                      Cân bé khi đến, hệ thống đối chiếu với hồ sơ trước khi thu tiền lưu trú.
                    </div>
                  </div>
                  {pending ? (
                    <CostConfirmationAlert
                      appointment={appointment}
                      pending={pending}
                      declaredWeightKg={outcome?.declaredWeightKg ?? pet?.weightKg ?? null}
                      overdue={overdue}
                    />
                  ) : reloadingAfterWeigh ? (
                    <p className="text-[13px] text-muted">Đang cập nhật kết quả đối chiếu…</p>
                  ) : (
                    canWeigh && (
                      <div className="flex flex-wrap items-end gap-3">
                        <Field
                          id="hotel-actual-weight"
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
                        <Button type="submit" variant="primary" loading={weighCheck.isPending} className="mb-px">
                          Đối chiếu cân nặng
                        </Button>
                      </div>
                    )
                  )}
                  {weighCheck.error && <ErrorAlert error={weighCheck.error} />}
                </li>
              )}

              {/* Vùng 10 – bước 2: thu tiền lưu trú. Nút “Thu tiền” → SW-09 thêm ở thẻ 128. */}
              <ServiceTask
                done={stayPayment?.status === "Paid"}
                name={
                  stayPayment
                    ? `${stayPayment.status === "Paid" ? "Đã thu" : "Thu"} tiền lưu trú: ${formatMoney(stayPayment.amount)}`
                    : "Thu tiền lưu trú"
                }
                detail="Thu tại quầy sau khi đối chiếu cân nặng, trước khi bé vào chuồng."
                aside={stayPayment && <PaymentBadge status={stayPayment.status} />}
              />

              {/* Vùng 11 – bước 3: đưa bé vào chuồng (thẻ 127). */}
              <ServiceTask
                done={false}
                name={cageCode ? `Đưa bé vào chuồng ${cageCode}` : "Đưa bé vào chuồng"}
                detail={`Lịch chuyển sang Đang lưu trú${cageCode ? `, chuồng ${cageCode} hiển thị đang chứa ${petName}` : ""}.`}
              />
            </ol>
          )}

          {acceptedElsewhere && (
            // Phản hồi `cageSuitable` chỉ có khi lễ tân ghi nhận ở D1; khách tự đồng ý thì màn này không biết chuồng còn
            // phù hợp không (GET /cages chưa dùng được tới thẻ 88), nên nhắc kiểm tra thay vì im lặng.
            <Alert tone="warn" title={`Khách đã đồng ý chi phí mới, lịch sang nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`}>
              Kiểm tra chuồng {cageCode || "đã gán"} còn phù hợp nhóm mới không; nếu không, báo quản lý gán chuồng phù hợp
              khác trước khi đưa bé vào chuồng.
            </Alert>
          )}
          {cageUnsuitable && (
            <Alert tone="warn" title={`Chuồng ${cageCode || "đã gán"} không còn phù hợp nhóm kích cỡ mới`}>
              Báo quản lý gán chuồng phù hợp khác trước khi đưa bé vào chuồng. Nếu hết chuồng phù hợp, quản lý hủy lịch
              với lý do cửa hàng không thể đáp ứng và lễ tân báo cho khách.
            </Alert>
          )}
        </CardBody>

        <CardFooter className="flex flex-wrap items-start gap-2.5">
          <ButtonLink href={ROUTES.appointments} variant="ghost">
            Quay lại
          </ButtonLink>
          {isConfirmed && pending && (
            <Button className="ml-auto" onClick={() => setResponseOpen(true)}>
              Ghi nhận phản hồi của khách
            </Button>
          )}
          {isConfirmed && !pending && (
            <div className="ml-auto flex flex-col items-end gap-1.5 max-[640px]:items-stretch">
              <Button variant="primary" disabled>
                Xác nhận tiếp nhận
              </Button>
              <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                <Icon name="lock" className="mt-px size-3.5" />
                {lockReason(weighed)}
              </p>
            </div>
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
          onResponded={(accept, result) => {
            if (accept) setAccepted({ cageSuitable: result.cageSuitable });
          }}
        />
      )}
    </Card>
  );
}
