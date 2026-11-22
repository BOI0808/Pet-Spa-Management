"use client";

// CW-09·D3 Thanh toán trực tuyến – UI-Screens CW-09, UF-11, FR-PAY-03.
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Modal } from "@/components/ui/modal";
import type { AppointmentDetail, Payment, PaymentGateway } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney } from "@/lib/format";
import { PAYMENT_GATEWAY_LABELS } from "@/lib/labels";
import { useStartOnlinePayment } from "@/lib/queries/payments";
import { rememberPendingPayment } from "../online-payment";

/** Thẻ chọn cổng (`.gw` của ui-demo): logo chữ trên nền màu của cổng (Design-System `GatewayOption`). */
const GATEWAYS: { value: PaymentGateway; logo: string; logoClass: string; note: string }[] = [
  { value: "VNPAY", logo: "VNPAY", logoClass: "bg-[#005BAA]", note: "Thẻ ngân hàng, ví VNPAY, QR" },
  { value: "MoMo", logo: "MoMo", logoClass: "bg-[#A50064]", note: "Thanh toán bằng ứng dụng MoMo" },
];

type OnlinePaymentDialogProps = {
  open: boolean;
  appointment: AppointmentDetail;
  payment: Payment;
  petName: string;
  onClose: () => void;
};

export function OnlinePaymentDialog({ open, appointment, payment, petName, onClose }: OnlinePaymentDialogProps) {
  const [gateway, setGateway] = useState<PaymentGateway>("VNPAY");
  const start = useStartOnlinePayment(appointment.appointmentId);
  // Đã nhận `paymentUrl`: giữ trạng thái đang gửi cho tới khi trình duyệt rời trang.
  const [redirecting, setRedirecting] = useState(false);
  const busy = start.isPending || redirecting;

  function close() {
    start.reset();
    onClose();
  }

  function submit() {
    start.mutate(
      { paymentId: payment.paymentId, gateway },
      {
        onSuccess: ({ paymentUrl, txnRef }) => {
          rememberPendingPayment({ appointmentId: appointment.appointmentId, txnRef, gateway });
          setRedirecting(true);
          window.location.assign(paymentUrl);
        },
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Thanh toán trực tuyến"
      description={`Lịch spa ${formatAppointmentCode(appointment.appointmentId)} của ${petName}.`}
      icon="card"
      tone="teal"
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Để sau
          </Button>
          <Button variant="primary" loading={busy} onClick={submit}>
            Tiếp tục đến cổng thanh toán
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Số tiền chỉ để xem; backend tự xác định số tiền gửi sang cổng (BR-17). */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3.5">
          <span className="text-muted">Số tiền</span>
          <span className="text-[22px] font-bold tabular-nums">{formatMoney(payment.amount)}</span>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Chọn cổng thanh toán</legend>
          {GATEWAYS.map((item) => (
            <ChoiceCard
              key={item.value}
              name="gateway"
              value={item.value}
              checked={gateway === item.value}
              onChange={() => setGateway(item.value)}
              disabled={busy}
              showDot
              className="gap-3.5 p-3.5"
            >
              <span
                aria-hidden="true"
                className={`grid h-8 w-12 shrink-0 place-items-center rounded-[7px] text-xs font-bold text-white ${item.logoClass}`}
              >
                {item.logo}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{PAYMENT_GATEWAY_LABELS[item.value]}</span>
                <span className="block text-xs text-muted">{item.note}</span>
              </span>
            </ChoiceCard>
          ))}
        </fieldset>
        <p className="text-xs text-muted">
          Bạn sẽ được chuyển sang cổng thanh toán (môi trường thử nghiệm). Trạng thái chuyển Đã thanh toán khi cửa hàng
          nhận được xác nhận khớp đủ số tiền từ cổng.
        </p>
        {/* 409 PAYMENT_NOT_DUE / INVALID_TRANSITION, 400 cổng chưa hỗ trợ: báo tại chỗ, khoản đã được tải lại. */}
        {start.error && <ErrorAlert error={start.error} />}
      </div>
    </Modal>
  );
}
