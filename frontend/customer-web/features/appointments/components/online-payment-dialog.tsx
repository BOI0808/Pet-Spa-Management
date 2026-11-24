"use client";

// CW-09·D3 Thanh toán trực tuyến – UI-Screens CW-09, UF-11, FR-PAY-03.
import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Modal } from "@/components/ui/modal";
import type { AppointmentDetail, Payment, PaymentGateway } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney } from "@/lib/format";
import { PAYMENT_GATEWAY_LABELS } from "@/lib/labels";
import { useStartOnlinePayment } from "@/lib/queries/payments";
import { rememberPendingPayment } from "../online-payment";

/**
 * Thẻ chọn cổng (`.gw` của ui-demo): logo chữ trên nền màu nhận diện của cổng (Design-System `GatewayOption`).
 * Ngoại lệ có chủ ý với danh sách cấm FC 11: đây là màu thương hiệu của VNPAY/MoMo lấy đúng từ ui-demo (`#m-pay`),
 * không phải màu giao diện của hệ thống nên không đưa vào token `@theme`.
 */
const GATEWAYS: { value: PaymentGateway; logo: string; logoClass: string; note: string }[] = [
  { value: "VNPAY", logo: "VNPAY", logoClass: "bg-[#005BAA]", note: "Thẻ ngân hàng, ví VNPAY, QR" },
  { value: "MoMo", logo: "MoMo", logoClass: "bg-[#A50064]", note: "Thanh toán bằng ứng dụng MoMo" },
];

type OnlinePaymentDialogProps = {
  open: boolean;
  appointment: AppointmentDetail;
  payment: Payment;
  petName: string;
  /**
   * Khoản còn thanh toán trực tuyến được (lịch spa `Completed`, khoản `Unpaid`). Khi khoản vừa đổi (vd. vừa ghi nhận tại
   * quầy, POST trả 409) hộp thoại vẫn mở để khách đọc lỗi, chỉ khóa nút gửi.
   */
  canPay: boolean;
  onClose: () => void;
};

export function OnlinePaymentDialog({ open, appointment, payment, petName, canPay, onClose }: OnlinePaymentDialogProps) {
  const [gateway, setGateway] = useState<PaymentGateway>("VNPAY");
  const start = useStartOnlinePayment(appointment.appointmentId);
  const { reset } = start;
  // Đã nhận `paymentUrl`: giữ trạng thái đang gửi cho tới khi trình duyệt rời trang.
  const [redirecting, setRedirecting] = useState(false);
  const busy = start.isPending || redirecting;

  // Khách bấm Back từ cổng: trình duyệt khôi phục trang từ bfcache với `redirecting = true`, hộp thoại sẽ kẹt ở trạng
  // thái đang gửi (Modal bỏ qua đóng khi `busy`). Mở khóa lại để khách chọn cổng khác hoặc “Để sau”.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      setRedirecting(false);
      reset();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  function close() {
    setRedirecting(false);
    reset();
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
          <Button variant="primary" loading={busy} disabled={!canPay} onClick={submit}>
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
        {/* Khoản đổi trạng thái khi hộp thoại đang mở mà không qua lỗi (vd. cửa hàng vừa ghi nhận tại quầy). */}
        {!canPay && !start.error && (
          <Alert tone="info">Khoản thanh toán này vừa được cập nhật, không cần thanh toán trực tuyến nữa.</Alert>
        )}
      </div>
    </Modal>
  );
}
