"use client";

// CW-09 vùng 9 “Kết quả thanh toán” khi quay về từ cổng (`?payment=return`) – UI-Screens CW-09, UF-11.
// Web không tự đánh dấu đã thanh toán: hỏi lại GET /appointments/{id}/payments tối đa 5 lần, cách 2 giây, đến khi
// khoản spa `Paid` (backend chỉ chuyển Paid sau webhook có chữ ký hợp lệ và khớp đủ số tiền – FR-PAY-03, BR-17).
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import type { AppointmentDetail, Payment } from "@/lib/api/types";
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

/**
 * Viền thẻ kết quả theo `tt-ok` / `tt-loi` của ui-demo (cùng màu viền `.alert-success` / `.alert-danger`, như
 * `components/feedback/alert.tsx`). Chưa có token `@theme` cho viền này nên giữ đúng giá trị ui-demo ở một chỗ.
 */
const SUCCESS_BORDER = "border-[#BFE0CA]";
const DANGER_BORDER = "border-[#EFC3BE]";

export type PaymentCheckState = "checking" | "paid" | "unpaid";

/**
 * Hỏi lại khoản spa sau khi quay về từ cổng. Dùng ở màn CW-09 (không phải trong thẻ) để vùng 7 biết thẻ kết quả đang
 * ở trạng thái nào. `enabled = false` thì không hỏi.
 */
export function usePaymentReturnCheck(appointmentId: string, enabled: boolean) {
  const payments = useAppointmentPayments(appointmentId);
  const { refetch } = payments;
  const spaPayment = findPayment(payments.data, "Spa");
  const isPaid = spaPayment?.status === "Paid";
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!enabled || isPaid || attempts >= PAYMENT_CHECK_ATTEMPTS) return;
    // Lần đầu hỏi ngay (dữ liệu trong bộ nhớ có thể là từ trước khi sang cổng), các lần sau cách 2 giây.
    const timer = window.setTimeout(
      () => {
        void refetch().finally(() => setAttempts((count) => count + 1));
      },
      attempts === 0 ? 0 : PAYMENT_CHECK_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [attempts, enabled, isPaid, refetch]);

  /** Hỏi lại thêm một lượt (nút “Kiểm tra lại”): webhook của cổng có thể đến chậm hơn lượt hỏi đầu. */
  const recheck = useCallback(() => setAttempts(0), []);

  let state: PaymentCheckState = "checking";
  if (isPaid) state = "paid";
  else if (attempts >= PAYMENT_CHECK_ATTEMPTS) state = "unpaid";
  return { state, spaPayment, recheck };
}

type ResultCardProps = {
  appointment: AppointmentDetail;
  state: PaymentCheckState;
  spaPayment: Payment | undefined;
  /** Cùng điều kiện mở CW-09·D3 (lịch spa `Completed`, khoản `Unpaid`): không thỏa thì không có nút “Thử lại”. */
  canPayOnline: boolean;
  onRecheck: () => void;
  /** Mở CW-09·D3 để thử lại. */
  onRetry: () => void;
};

export function PaymentResultCard({ appointment, state, spaPayment, canPayOnline, onRecheck, onRetry }: ResultCardProps) {
  // Giao dịch phiên này vừa mở cho đúng lịch (để nêu tên cổng, mã giao dịch); đọc một lần khi vào màn.
  const [pending] = useState<PendingOnlinePayment | null>(() => {
    const stored = typeof window === "undefined" ? null : readPendingPayment();
    return stored?.appointmentId === appointment.appointmentId ? stored : null;
  });

  // Đã có kết quả (thành công hay chưa) thì xóa giao dịch đã lưu, để lần quay về sau không nêu nhầm cổng hay mã giao
  // dịch cũ. Thẻ vẫn giữ bản đã đọc ở trên; lần “Thử lại” sẽ lưu giao dịch mới.
  useEffect(() => {
    if (state !== "checking") clearPendingPayment();
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
        className={`mb-4 flex items-center gap-4 rounded-2xl border ${SUCCESS_BORDER} bg-success-50 p-5 max-[640px]:flex-col max-[640px]:items-start`}
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

  // Hết lượt hỏi chỉ có nghĩa là cửa hàng chưa nhận được xác nhận: webhook (IPN) có thể đến chậm trong khi tiền đã bị
  // trừ, nên không khẳng định “chưa bị trừ tiền” và nhắc khách kiểm tra lại trước khi trả lần nữa.
  return (
    <div
      role="alert"
      className={`mb-4 flex items-center gap-4 rounded-2xl border ${DANGER_BORDER} bg-danger-50 p-5 max-[640px]:flex-col max-[640px]:items-start`}
    >
      <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-danger text-white">
        <Icon name="x" className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h2>Thanh toán chưa thành công</h2>
        <p className="text-muted">
          Cửa hàng chưa nhận được xác nhận giao dịch từ cổng thanh toán, khoản thanh toán vẫn là Chưa thanh toán. Nếu tài
          khoản của bạn đã bị trừ tiền, vui lòng đợi vài phút rồi bấm Kiểm tra lại, không thanh toán thêm lần nữa. Bạn
          cũng có thể thử lại hoặc thanh toán tại quầy khi đón bé.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="secondary" onClick={onRecheck}>
          Kiểm tra lại
        </Button>
        {/* Không còn khoản để thanh toán trực tuyến (vd. vừa trả tại quầy) thì không có gì để thử lại. */}
        {canPayOnline && (
          <Button variant="primary" onClick={onRetry}>
            <Icon name="refresh" />
            Thử lại
          </Button>
        )}
      </div>
    </div>
  );
}
