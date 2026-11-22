"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import type { ApiError } from "@/lib/api/errors";
import type { CounterMethod, Payment } from "@/lib/api/types";
import { formatAmount, formatAppointmentCode, formatMoney } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { useRecordCounterPayment } from "@/lib/queries/payments";
import {
  AMOUNT_MISMATCH_CODE,
  AMOUNT_SHORT_MESSAGE,
  toCounterPaymentRequest,
  validateReceivedAmount,
  type CounterPaymentFormValues,
} from "../forms";

const FORM_ID = "counter-payment-form";

// Thứ tự và biểu tượng theo MW-10·D1 của ui-demo: Tiền mặt, Chuyển khoản QR.
const METHOD_OPTIONS: readonly SegmentedOption<CounterMethod>[] = [
  { value: "Cash", label: PAYMENT_METHOD_LABELS.Cash, icon: <Icon name="cash" className="size-4" /> },
  { value: "BankQR", label: PAYMENT_METHOD_LABELS.BankQR, icon: <Icon name="qr" className="size-4" /> },
];

type CounterPaymentDialogProps = {
  /** Khoản `Unpaid` đang ghi nhận. */
  payment: Payment;
  onClose: () => void;
  /** Gọi khi backend đã ghi nhận xong, trước khi đóng hộp thoại. */
  onRecorded: () => void;
};

/**
 * MW-10·D1 Ghi nhận thanh toán tại quầy (hộp thoại giữa màn) – UI-Screens.md. Chỉ render khi đang mở nên form luôn bắt đầu từ giá trị mới.
 * Số tiền phải trả do backend xác định: web chỉ hiển thị, không gửi `amount` (BR-17). `Payment` chưa có tên thú cưng (G-07)
 * nên dòng phụ chỉ ghi khoản và mã lịch.
 */
export function CounterPaymentDialog({ payment, onClose, onRecorded }: CounterPaymentDialogProps) {
  const titleId = useId();
  const { showSuccess } = useToast();
  const recordPayment = useRecordCounterPayment();
  const [method, setMethod] = useState<CounterMethod>("Cash");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CounterPaymentFormValues>({
    defaultValues: { receivedAmount: formatAmount(payment.amount) },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const isPending = recordPayment.isPending;
  const submitError = recordPayment.error;

  // Thiếu tiền (409) báo ngay dưới ô số tiền; sai thời điểm, chờ khách xác nhận chi phí… hiện ở alert đầu form bằng câu của backend.
  function handleError(error: ApiError) {
    if (error.code === AMOUNT_MISMATCH_CODE) setError("receivedAmount", { message: AMOUNT_SHORT_MESSAGE });
  }

  const handleRecord = handleSubmit((values) => {
    recordPayment.mutate(
      { paymentId: payment.paymentId, ...toCounterPaymentRequest(method, values) },
      {
        onSuccess: () => {
          showSuccess(`Đã ghi nhận thanh toán ${formatMoney(payment.amount)}`);
          onRecorded();
          onClose();
        },
        onError: handleError,
      },
    );
  });

  return (
    <Overlay labelledBy={titleId} onClose={onClose} locked={isPending}>
      {/* Khung `.modal` của ui-demo, cùng kích thước và hoạt ảnh với ConfirmDialog. */}
      <div className="max-h-[calc(100vh-40px)] w-full max-w-[480px] animate-pop-in overflow-auto rounded-2xl bg-white shadow-pop">
        <div className="flex items-start gap-3.5 px-5 pt-5">
          {/* Ô biểu tượng tông teal: `.mh-icon.teal` của ui-demo. */}
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lagoon-50 text-lagoon">
            <Icon name="wallet" className="size-[22px]" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-lg leading-[26px]">
              Ghi nhận thanh toán tại quầy
            </h2>
            <p className="mt-0.5 text-muted">
              {PAYMENT_KIND_LABELS[payment.kind]}, {formatAppointmentCode(payment.appointmentId)}.
            </p>
          </div>
        </div>

        <form id={FORM_ID} noValidate onSubmit={handleRecord} className="flex flex-col gap-4 px-5 py-4">
          <ErrorAlert error={submitError?.code === AMOUNT_MISMATCH_CODE ? null : submitError} />

          <div className="flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3.5">
            <span className="text-muted">Số tiền phải trả</span>
            <strong className="text-[22px] font-bold leading-7 tabular-nums">{formatMoney(payment.amount)}</strong>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold leading-[18px] text-ink">Phương thức</p>
            <SegmentedControl
              label="Phương thức thanh toán"
              options={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
              className="w-full"
            />
          </div>

          <Field
            id="counter-received-amount"
            label="Số tiền thực nhận"
            required
            hint="Phải bằng hoặc lớn hơn số tiền phải trả."
            error={errors.receivedAmount?.message}
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
        </form>

        <div className="flex justify-end gap-2.5 px-5 pb-5 pt-3.5">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={isPending}>
            Xác nhận đã thanh toán
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
