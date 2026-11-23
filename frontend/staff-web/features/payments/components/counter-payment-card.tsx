"use client";

// SW-09 vùng 2 → 8 – thẻ ghi nhận một khoản (UI-Screens.md; FR-PAY-02; BR-07, BR-09, BR-17). Số tiền phải trả do backend
// tính (`payment.amount`); web chỉ hiển thị và giải thích cách tính, không gửi `amount` (BR-17).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { PaymentBadge } from "@/components/domain/status-badge";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { KeyValue } from "@/components/ui/key-value";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/use-session";
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CounterMethod, Payment, Pet } from "@/lib/api/types";
import { formatAmount, formatAppointmentCode, formatDayMonth, formatMoney, formatWeight } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useHotelPricing } from "@/lib/queries/hotel";
import { useRecordCounterPayment } from "@/lib/queries/payments";
import { useServices } from "@/lib/queries/services";
import { formatAccountNumber, STORE_BANK, vietQrImageUrl } from "@/lib/store-info";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { findPricing, nightsOf } from "@/features/appointments/appointments";
import {
  AMOUNT_MISMATCH_CODE,
  AMOUNT_SHORT_MESSAGE,
  compareReceived,
  COUNTER_ERROR_MESSAGES,
  toCounterPaymentRequest,
  validateReceivedAmount,
  type CounterPaymentFormValues,
} from "../forms";
import { DUE_TITLE_LABELS, lateMinutes, returnRouteAfterPaid, transferContent } from "../payments";

// Thứ tự và biểu tượng theo ui-demo SW-09, cùng cách khai báo với MW-10·D1 của manager-web.
const METHOD_OPTIONS: readonly SegmentedOption<CounterMethod>[] = [
  { value: "Cash", label: PAYMENT_METHOD_LABELS.Cash, icon: <Icon name="cash" className="size-4" /> },
  { value: "BankQR", label: PAYMENT_METHOD_LABELS.BankQR, icon: <Icon name="qr" className="size-4" /> },
];

/** “18:00, 06/10” – giờ trả ở phần cách tính phí trễ (ui-demo SW-09). */
function formatTimeDay(isoDateTime: string) {
  return `${toStoreTime(isoDateTime)}, ${formatDayMonth(toStoreDate(isoDateTime))}`;
}

type CalculationProps = { appointment: AppointmentDetail; pet: Pet | null; payment: Payment };

/**
 * Vùng 3 – cách tính, chỉ để giải thích con số (G-05: lịch không lưu đơn giá). Bảng giá có thể đã đổi sau khi đặt lịch, nên
 * dòng nào không tra được thì bỏ, không tự cộng lại; số tiền thu luôn là `payment.amount`.
 */
function Calculation({ appointment, pet, payment }: CalculationProps) {
  const isSpa = payment.kind === "Spa";
  const hotelPricing = useHotelPricing();
  const services = useServices(pet ? { species: pet.species, sizeGroup: appointment.sizeGroup } : {}, {
    enabled: pet !== null && isSpa,
  });

  const group = pet
    ? `${SPECIES_LABELS[pet.species]}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`
    : `Nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`;

  let rows;
  if (payment.kind === "Stay") {
    const nights = nightsOf(appointment);
    const price = pet
      ? hotelPricing.data?.pricing.find((row) => row.species === pet.species && row.sizeGroup === appointment.sizeGroup)
      : undefined;
    rows = (
      <>
        <KeyValue label="Lịch hẹn">Đã xác nhận, chờ tiếp nhận</KeyValue>
        <KeyValue label="Nhóm áp dụng">
          {group}
          {appointment.actualWeightKg != null && ` (đã đối chiếu ${formatWeight(appointment.actualWeightKg)})`}
        </KeyValue>
        {price && nights !== null && (
          <KeyValue label="Cách tính">
            {nights} đêm × ({formatMoney(price.pricePerNight)} + {formatMoney(price.foodPerNight)})
          </KeyValue>
        )}
      </>
    );
  } else if (isSpa) {
    rows = (
      <>
        <KeyValue label="Lịch hẹn">Hoàn tất</KeyValue>
        <KeyValue label="Nhóm áp dụng">{group}</KeyValue>
        {(appointment.services ?? []).map((service) => {
          const pricing = pet ? findPricing(services.data, service.serviceId, pet.species, appointment.sizeGroup) : undefined;
          return (
            <KeyValue key={service.serviceId} label={service.name ?? "Dịch vụ"}>
              {pricing ? formatMoney(pricing.price) : "—"}
            </KeyValue>
          );
        })}
      </>
    );
  } else {
    const late = lateMinutes(appointment);
    const feePerBlock = hotelPricing.data?.lateFeePerBlock;
    // Số lần phí = số tiền ÷ mức phí mỗi lần (BR-22); chỉ hiện khi chia hết, tức mức phí chưa đổi từ lúc tính.
    const blocks = feePerBlock && payment.amount % feePerBlock === 0 ? payment.amount / feePerBlock : null;
    rows = (
      <>
        {appointment.plannedCheckOut && (
          <KeyValue label="Trả dự kiến">{formatTimeDay(appointment.plannedCheckOut)}</KeyValue>
        )}
        {appointment.actualCheckOut && (
          <KeyValue label="Trả thực tế">
            {formatTimeDay(appointment.actualCheckOut)}
            {late !== null && ` (trễ ${late} phút)`}
          </KeyValue>
        )}
        {blocks !== null && feePerBlock && (
          <KeyValue label="Cách tính">
            {blocks} lần × {formatMoney(feePerBlock)}
          </KeyValue>
        )}
      </>
    );
  }

  return <div className="rounded-xl bg-mist px-4 py-1.5">{rows}</div>;
}

type CounterPaymentCardProps = {
  appointment: AppointmentDetail;
  pet: Pet | null;
  /** Khoản Chưa thanh toán đang đến hạn của lịch. */
  payment: Payment;
};

/**
 * Chỉ dựng khi đã có khoản đến hạn; đổi khoản thì màn dựng lại thẻ (`key`) để ô số tiền, ô tích và lỗi của khoản trước
 * không còn.
 */
export function CounterPaymentCard({ appointment, pet, payment }: CounterPaymentCardProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const { me } = useSession();
  const recordPayment = useRecordCounterPayment();
  const [method, setMethod] = useState<CounterMethod>("Cash");
  /** Ô “Đã kiểm tra tiền vào tài khoản cửa hàng” (vùng 8, Đề xuất): bắt buộc tích mới bật nút khi chuyển khoản QR. */
  const [transferChecked, setTransferChecked] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<CounterPaymentFormValues>({
    // Tiền mặt: để trống cho lễ tân nhập số khách đưa. Chuyển khoản: điền sẵn số phải trả (đổi phương thức ở `changeMethod`).
    defaultValues: { receivedAmount: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const received = useWatch({ control, name: "receivedAmount" });
  const comparison = compareReceived(received, payment.amount);
  const isShort = comparison?.short === true;
  const petName = appointment.petName ?? pet?.name ?? "Thú cưng";
  const content = transferContent(appointment.appointmentId);
  const isPending = recordPayment.isPending;
  const submitError = recordPayment.error;
  const locked = isShort || (method === "BankQR" && !transferChecked);

  function changeMethod(next: CounterMethod) {
    if (next === method) return;
    setMethod(next);
    setTransferChecked(false);
    clearErrors();
    recordPayment.reset();
    setValue("receivedAmount", next === "BankQR" ? formatAmount(payment.amount) : "");
  }

  // Thiếu tiền (409) báo dưới ô số tiền; các lỗi 409 khác hiện ở ErrorAlert, dữ liệu đã được tải lại trong hook.
  function handleError(error: ApiError) {
    if (error.code === AMOUNT_MISMATCH_CODE) setError("receivedAmount", { message: AMOUNT_SHORT_MESSAGE });
  }

  const submit = handleSubmit((values) => {
    if (locked) return;
    recordPayment.mutate(
      { paymentId: payment.paymentId, ...toCounterPaymentRequest(method, values) },
      {
        onSuccess: () => {
          showSuccess(`Đã ghi nhận thanh toán ${formatMoney(payment.amount)}`);
          router.push(returnRouteAfterPaid(payment.kind, appointment.appointmentId));
        },
        onError: handleError,
      },
    );
  });

  // Lỗi thiếu tiền hiện ngay khi gõ, không chờ rời ô, để lễ tân thấy “Còn thiếu” cùng lúc với câu lỗi (ui-demo).
  const amountError = errors.receivedAmount?.message ?? (isShort ? AMOUNT_SHORT_MESSAGE : undefined);
  const alertError = submitError?.code === AMOUNT_MISMATCH_CODE ? null : submitError;
  const amountField = (
    <Field
      id="counter-received-amount"
      label={method === "Cash" ? "Số tiền khách đưa" : "Số tiền đã nhận"}
      required
      error={amountError}
    >
      {(field) => (
        <Input
          {...field}
          {...register("receivedAmount", { validate: (value) => validateReceivedAmount(value, payment.amount) })}
          suffix="đ"
          inputMode="numeric"
          autoComplete="off"
          className="tabular-nums"
        />
      )}
    </Field>
  );

  return (
    <Card>
      {/* Vùng 2 – đầu thẻ. Thẻ “có tài khoản / vãng lai” chưa có trong lịch hẹn (G-05) nên chỉ ghi tên khách. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4">
        {pet ? <PetAvatar species={pet.species} /> : <Skeleton className="size-[48px] rounded-2xl" />}
        <div className="min-w-0 flex-1 basis-[200px]">
          <h2 className="break-words">
            {petName}: {DUE_TITLE_LABELS[payment.kind]}
          </h2>
          <p className="break-words text-[13px] text-muted">
            {formatAppointmentCode(appointment.appointmentId)}. {appointment.customerName ?? "—"}
          </p>
        </div>
        <PaymentBadge status={payment.status} />
      </div>

      <form noValidate onSubmit={submit}>
        <CardBody className="flex flex-col gap-4">
          <ErrorAlert
            error={alertError}
            message={alertError?.code ? COUNTER_ERROR_MESSAGES[alertError.code] : undefined}
          />

          <Calculation appointment={appointment} pet={pet} payment={payment} />

          {/* Vùng 4 – số tiền phải trả. */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">Số tiền phải trả</span>
            <strong className="text-[28px] font-bold leading-[34px] tabular-nums">{formatMoney(payment.amount)}</strong>
          </div>

          {/* Vùng 5 – phương thức. */}
          <div>
            <p className="mb-1.5 text-[13px] font-semibold leading-[18px] text-ink">Phương thức</p>
            <SegmentedControl
              label="Phương thức thanh toán"
              options={METHOD_OPTIONS}
              value={method}
              onChange={changeMethod}
            />
          </div>

          {method === "Cash" ? (
            // Vùng 6 – tiền mặt: tiền thối lại hoặc còn thiếu tính ở web.
            <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
              {amountField}
              <Field id="counter-change" label={isShort ? "Còn thiếu" : "Tiền thối lại"}>
                {(field) => (
                  <Input
                    {...field}
                    readOnly
                    tabIndex={-1}
                    value={
                      comparison === null
                        ? ""
                        : formatMoney(comparison.short ? comparison.missing : comparison.change)
                    }
                    className={`bg-mist! tabular-nums ${isShort ? "font-semibold text-danger!" : ""}`}
                  />
                )}
              </Field>
            </div>
          ) : (
            // Vùng 8 – chuyển khoản QR (G-16: tài khoản trong lib/store-info.ts).
            <div className="flex items-start gap-5 max-[640px]:flex-col max-[640px]:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do img.vietqr.io dựng theo số tiền, không qua next/image */}
              <img
                src={vietQrImageUrl(payment.amount, content)}
                alt={`Mã QR chuyển khoản ${formatMoney(payment.amount)}, nội dung ${content}`}
                width={180}
                height={180}
                className="size-[180px] shrink-0 rounded-xl border border-line bg-white p-2"
              />
              <div className="flex w-full min-w-0 flex-col gap-3">
                <div>
                  <KeyValue label="Ngân hàng">{STORE_BANK.bankName}</KeyValue>
                  <KeyValue label="Số tài khoản">
                    <span className="tabular-nums">{formatAccountNumber(STORE_BANK.accountNumber)}</span>
                  </KeyValue>
                  <KeyValue label="Nội dung">{content}</KeyValue>
                </div>
                {amountField}
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={transferChecked}
                    onChange={(event) => setTransferChecked(event.target.checked)}
                    className="size-4 accent-lagoon"
                  />
                  Đã kiểm tra tiền vào tài khoản cửa hàng
                </label>
              </div>
            </div>
          )}
        </CardBody>

        {/* Vùng 7 – chân thẻ. */}
        <CardFooter className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-muted">Người xác nhận: {me?.fullName ?? "—"}</span>
          <Button type="submit" variant="primary" loading={isPending} disabled={locked} className="ml-auto">
            Xác nhận đã thanh toán
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
