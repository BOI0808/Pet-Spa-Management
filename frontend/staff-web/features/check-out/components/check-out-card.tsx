"use client";

// SW-10 vùng 1 → 6 – thẻ trả thú cưng của một lịch lưu trú (UI-Screens.md, FR-HTL-09, BR-07, BR-22, G-12).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { PaymentBadge, StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, Payment, Pet } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatMoney } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useAppointmentPayments, useCheckOut } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { paymentsRoute, ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { findPayment, speciesAndBreed } from "@/features/appointments/appointments";
import { checkOutMoment, formatStayMoment, minutesFromPlanned, paidLine } from "../check-out";

/** Giờ hiện tại, cập nhật mỗi 30 giây: đủ để ô giờ trả (chỉ hiện đến phút) không lệch quá nửa phút. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
    </div>
  );
}

/**
 * Vùng 4 – ghi chú sớm/trễ, chỉ để báo khách. Web không đọc được số phút miễn phí và mức phí (G-03, G-12) nên không tự
 * tính tiền phạt: số tiền lấy từ khoản `LateFee` khi backend đã tạo.
 */
function LateNote({ minutes, lateFee }: { minutes: number; lateFee: Payment | undefined }) {
  if (minutes <= 0) {
    const early = minutes < 0 ? `Đón sớm ${-minutes} phút so với giờ trả dự kiến.` : "Đón đúng giờ trả dự kiến.";
    return (
      <Alert tone="success" title="Không tính phí trả muộn">
        {early} Xử lý như trả bình thường, không hoàn tiền.
      </Alert>
    );
  }
  return (
    <Alert
      tone="warn"
      title={lateFee ? `Trễ ${minutes} phút: phí trả muộn ${formatMoney(lateFee.amount)}` : `Trễ ${minutes} phút so với giờ trả dự kiến`}
    >
      {lateFee
        ? "Thu phí trả muộn tại quầy trước khi hoàn tất."
        : "Hệ thống tính phí trả muộn (nếu có) khi bạn xác nhận trả: trễ trong thời gian miễn phí thì không phát sinh."}
    </Alert>
  );
}

type CheckOutCardProps = {
  appointment: AppointmentDetail;
  pet: Pet | null;
};

export function CheckOutCard({ appointment, pet }: CheckOutCardProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const now = useNow();
  const cages = useCages();
  const payments = useAppointmentPayments(appointment.appointmentId);
  const checkOut = useCheckOut();

  const petName = appointment.petName ?? pet?.name ?? "Thú cưng";
  const cage = appointment.cageId ? cages.data?.items.find((item) => item.cageId === appointment.cageId) : undefined;
  const cageCode = cage?.code ?? "";
  const stayPayment = findPayment(payments.data, "Stay");
  const lateFee = findPayment(payments.data, "LateFee");
  const lateFeeUnpaid = lateFee?.status === "Unpaid";
  const isInStay = appointment.status === "InStay";

  const moment = checkOutMoment(appointment, now);
  const minutes = minutesFromPlanned(appointment, moment);

  const confirm = () => {
    checkOut.mutate(appointment.appointmentId, {
      onSuccess: () => {
        // Câu và nơi đến theo ui-demo SW-10.
        showSuccess(`Đã trả ${petName} cho khách.${cageCode ? ` Chuồng ${cageCode} đã trống.` : ""}`);
        router.push(ROUTES.cages);
      },
    });
  };

  // 409 PAYMENT_NOT_DUE là bước bình thường khi đón trễ (G-12): backend vừa tạo khoản phí, hook đã tải lại khoản thanh
  // toán. Không hiện như lỗi; vùng 5 hiện khoản phí kèm nút thu, nút xác nhận khóa với lý do.
  const lateFeeJustCreated = checkOut.error?.code === "PAYMENT_NOT_DUE";
  const otherError = checkOut.error && !lateFeeJustCreated ? checkOut.error : null;

  let statusNote: string | null = null;
  if (appointment.status === "Completed") {
    statusNote = appointment.actualCheckOut
      ? `Lịch đã hoàn tất, bé đã được trả lúc ${formatStayMoment(appointment.actualCheckOut)}.`
      : "Lịch đã hoàn tất, bé đã được trả.";
  } else if (!isInStay) {
    statusNote = `Lịch đang ở trạng thái ${APPOINTMENT_STATUS_LABELS[appointment.status]}, không ở bước trả thú cưng.`;
  }

  const lateFeeRow = (() => {
    if (payments.isPending) return <Skeleton className="h-10 w-full" />;
    if (!lateFee) {
      // Chưa bấm xác nhận mà đang trễ: chưa biết có phí không (backend tính lúc xác nhận).
      const unknown = !appointment.actualCheckOut && minutes !== null && minutes > 0;
      return (
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">Phí trả muộn</div>
          <span className="text-muted">{unknown ? "Tính khi xác nhận trả" : "Không phát sinh"}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">Phí trả muộn</div>
            {paidLine(lateFee) && <div className="text-xs text-muted">{paidLine(lateFee)}</div>}
          </div>
          <div className="text-right">
            <div className="font-semibold tabular-nums">{formatMoney(lateFee.amount)}</div>
            <PaymentBadge status={lateFee.status} />
          </div>
        </div>
        {lateFeeUnpaid && isInStay && (
          <ButtonLink href={paymentsRoute(appointment.appointmentId)} block>
            <Icon name="wallet" className="size-[18px]" />
            Thu phí trả muộn
          </ButtonLink>
        )}
      </div>
    );
  })();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 max-[980px]:grid-cols-1">
      <Card>
        {/* Vùng 1 – đầu thẻ. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4">
          {pet ? <PetAvatar species={pet.species} size="lg" /> : <Skeleton className="size-[72px] rounded-[22px]" />}
          <div className="min-w-0 flex-1 basis-[220px]">
            <h2 className="break-words">
              {petName}
              {pet && `, ${speciesAndBreed(pet).toLocaleLowerCase("vi-VN")}`}
            </h2>
            {/* Số điện thoại chủ chưa có trong lịch hẹn (G-05). */}
            <p className="text-[13px] text-muted">
              {formatAppointmentCode(appointment.appointmentId)}. Chủ: {appointment.customerName ?? "—"}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <CardBody className="flex flex-col gap-4">
          {/* Vùng 2 – thông tin lưu trú. */}
          <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
            <InfoBox
              label="Chuồng"
              value={
                cage
                  ? `${cage.code}, ${SPECIES_LABELS[cage.species].toLocaleLowerCase("vi-VN")} nhóm ${SIZE_GROUP_LABELS[cage.sizeGroup]}`
                  : "—"
              }
            />
            <InfoBox label="Nhận" value={appointment.plannedCheckIn ? formatStayMoment(appointment.plannedCheckIn) : "—"} />
            <InfoBox
              label="Trả dự kiến"
              value={appointment.plannedCheckOut ? formatStayMoment(appointment.plannedCheckOut) : "—"}
            />
          </div>

          {statusNote ? (
            <Alert tone="neutral">{statusNote}</Alert>
          ) : (
            <>
              {/* Vùng 3 – thời điểm trả thực tế, chỉ đọc (G-12: backend ghi lúc bấm xác nhận lần đầu). */}
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold">Ngày trả thực tế</div>
                  <div className="flex h-11 items-center rounded-xl border border-line bg-mist px-3.5 tabular-nums">
                    {formatDate(toStoreDate(new Date(moment).toISOString()))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold">Giờ trả thực tế</div>
                  <div className="flex h-11 items-center rounded-xl border border-line bg-mist px-3.5 tabular-nums">
                    {toStoreTime(new Date(moment).toISOString())}
                  </div>
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted">
                {appointment.actualCheckOut
                  ? "Đã ghi nhận ở lần xác nhận đầu; phí trả muộn tính theo giờ này."
                  : "Giờ hiện tại. Hệ thống ghi nhận giờ trả khi bạn bấm xác nhận."}
              </p>

              {/* Vùng 4 – ghi chú trễ. */}
              {minutes !== null && <LateNote minutes={minutes} lateFee={lateFee} />}
            </>
          )}
        </CardBody>
      </Card>

      <aside className="flex flex-col gap-4">
        {/* Vùng 5 – thanh toán. */}
        <Card>
          <CardHeader title="Thanh toán" />
          <CardBody className="flex flex-col gap-4">
            {payments.isError ? (
              <div className="flex flex-col items-start gap-3">
                <ErrorAlert error={payments.error} className="w-full" />
                <Button size="sm" onClick={() => void payments.refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : (
              <>
                {payments.isPending ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">Tiền lưu trú</div>
                      {paidLine(stayPayment) && <div className="text-xs text-muted">{paidLine(stayPayment)}</div>}
                    </div>
                    {stayPayment ? (
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{formatMoney(stayPayment.amount)}</div>
                        <PaymentBadge status={stayPayment.status} />
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                )}
                <div className="border-t border-line-soft" />
                {lateFeeRow}
              </>
            )}
          </CardBody>
        </Card>

        {/* Vùng 6 – xác nhận. */}
        {isInStay && (
          <Card className="flex flex-col gap-3 p-5">
            {lateFeeUnpaid ? (
              <>
                <Button variant="primary" size="lg" block disabled>
                  <Icon name="handover" className="size-5" />
                  Xác nhận trả thú cưng
                </Button>
                <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                  <Icon name="lock" className="mt-px size-3.5" />
                  Cần thu phí trả muộn trước khi hoàn tất.
                </p>
              </>
            ) : (
              <Button
                variant="primary"
                size="lg"
                block
                // Khoản thanh toán chưa tải xong thì chưa biết còn phí trễ chưa thu không.
                disabled={payments.isPending}
                loading={checkOut.isPending}
                onClick={confirm}
              >
                <Icon name="handover" className="size-5" />
                Xác nhận trả thú cưng
              </Button>
            )}
            {otherError && <ErrorAlert error={otherError} />}
            <p className="text-xs text-muted">
              Sau khi xác nhận, lịch chuyển Hoàn tất và chuồng {cageCode || "đã gán"} trống để nhận bé khác.
            </p>
          </Card>
        )}
        {!isInStay && (
          <ButtonLink href={ROUTES.cages} variant="ghost">
            Xem tình trạng chuồng
          </ButtonLink>
        )}
      </aside>
    </div>
  );
}
