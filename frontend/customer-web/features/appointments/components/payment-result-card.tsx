"use client";

// CW-09 vùng 9 “Kết quả thanh toán” khi quay về từ cổng (`?payment=return`) – UI-Screens CW-09, UF-11.
// Web không tự đánh dấu đã thanh toán: hỏi lại GET /appointments/{id}/payments tối đa 5 lần, cách 2 giây, đến khi
// khoản spa `Paid` (backend chỉ chuyển Paid sau webhook có chữ ký hợp lệ và khớp đủ số tiền – FR-PAY-03, BR-17).
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { PAYMENT_GATEWAY_LABELS } from "@/lib/labels";
import { useAppointmentPayments } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import { findPayment, formatDateTime } from "../appointments";
import {
  clearPendingPayment,
  PAYMENT_CHECK_ATTEMPTS,
  PAYMENT_CHECK_INTERVAL_MS,
  readPendingPayment,
  type PendingOnlinePayment,
} from "../online-payment";

type CheckState = "checking" | "paid" | "unpaid";

/** Hỏi lại khoản spa sau khi quay về từ cổng; trả trạng thái để hiện thẻ kết quả. */
function usePaymentReturnCheck(appointmentId: string) {
  const payments = useAppointmentPayments(appointmentId);
  const { refetch } = payments;
  const spaPayment = findPayment(payments.data, "Spa");
  const isPaid = spaPayment?.status === "Paid";
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (isPaid || attempts >= PAYMENT_CHECK_ATTEMPTS) return;
    // Lần đầu hỏi ngay (dữ liệu trong bộ nhớ có thể là từ trước khi sang cổng), các lần sau cách 2 giây.
    const timer = window.setTimeout(
      () => {
        void refetch().finally(() => setAttempts((count) => count + 1));
      },
      attempts === 0 ? 0 : PAYMENT_CHECK_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [attempts, isPaid, refetch]);

  let state: CheckState = "checking";
  if (isPaid) state = "paid";
  else if (attempts >= PAYMENT_CHECK_ATTEMPTS) state = "unpaid";
  return { state, spaPayment };
}

type ResultCardProps = {
  appointment: AppointmentDetail;
  /** Mở CW-09·D3 để thử lại. */
  onRetry: () => void;
};

export function PaymentResultCard({ appointment, onRetry }: ResultCardProps) {
  const { state, spaPayment } = usePaymentReturnCheck(appointment.appointmentId);
  // Giao dịch phiên này vừa mở cho đúng lịch (để nêu tên cổng, mã giao dịch); đọc một lần khi vào màn.
  const [pending] = useState<PendingOnlinePayment | null>(() => {
    const stored = typeof window === "undefined" ? null : readPendingPayment();
    return stored?.appointmentId === appointment.appointmentId ? stored : null;
  });

  useEffect(() => {
    if (state === "paid") clearPendingPayment();
  }, [state]);

  if (state === "checking") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-4 flex items-center gap-4 rounded-2xl border border-line bg-white p-5"
      >
        <span aria-hidden="true" className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-lagoon/30 border-t-lagoon" />
        <div>
          <h2>Đang kiểm tra kết quả thanh toán</h2>
          <p className="text-muted">Cửa hàng đang chờ cổng thanh toán xác nhận giao dịch, vui lòng đợi trong giây lát.</p>
        </div>
      </div>
    );
  }

  if (state === "paid" && spaPayment) {
    const via = pending ? ` qua ${PAYMENT_GATEWAY_LABELS[pending.gateway]}` : " qua cổng thanh toán trực tuyến";
    const at = spaPayment.paidAt ? ` lúc ${formatDateTime(spaPayment.paidAt)}` : "";
    return (
      <div
        role="status"
        className="mb-4 flex items-center gap-4 rounded-2xl border border-[#BFE0CA] bg-success-50 p-5 max-[640px]:flex-col max-[640px]:items-start"
      >
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-success text-white">
          <Icon name="check" className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2>Thanh toán thành công</h2>
          <p className="break-words text-muted">
            Cửa hàng đã nhận {formatMoney(spaPayment.amount)}
            {via}
            {at}.{pending ? ` Mã giao dịch ${pending.txnRef}.` : ""}
          </p>
        </div>
        <ButtonLink href={ROUTES.appointments} variant="secondary">
          Về lịch hẹn của tôi
        </ButtonLink>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-4 rounded-2xl border border-[#EFC3BE] bg-danger-50 p-5 max-[640px]:flex-col max-[640px]:items-start"
    >
      <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-danger text-white">
        <Icon name="x" className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h2>Thanh toán chưa thành công</h2>
        <p className="text-muted">
          Cổng thanh toán chưa xác nhận giao dịch. Khoản thanh toán vẫn là Chưa thanh toán, bạn chưa bị trừ tiền. Bạn có
          thể thử lại hoặc thanh toán tại quầy khi đón bé.
        </p>
      </div>
      {/* Không còn khoản spa chưa thanh toán (vd. vừa trả tại quầy) thì không có gì để thử lại. */}
      {spaPayment?.status === "Unpaid" && (
        <Button variant="primary" onClick={onRetry}>
          <Icon name="refresh" />
          Thử lại
        </Button>
      )}
    </div>
  );
}
