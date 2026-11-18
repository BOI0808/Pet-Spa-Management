import Link from "next/link";
import { PaymentStatusBadge } from "@/components/domain/status-badge";
import type { Payment } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth, formatMoney } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

/** “2026-10-05T09:12:00+00:00” → “16:12 05/10” theo múi giờ cửa hàng. */
function formatPaidAt(iso: string) {
  return `${toStoreTime(iso)} ${formatDayMonth(toStoreDate(iso))}`;
}

type PaymentRowProps = {
  payment: Payment;
};

/**
 * Một dòng của bảng MW-10 (vùng 3). `Payment` chưa có tên thú cưng, tên khách, người xác nhận (G-07)
 * nên cột Lịch hẹn chỉ có mã, liên kết sang MW-05; cột Ghi nhận chỉ có phương thức và thời điểm.
 */
export function PaymentRow({ payment }: PaymentRowProps) {
  const isPaid = payment.status === "Paid";

  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className="[&:hover>td]:bg-[#F8FBFB]">
      <td className={`${cellClass} whitespace-nowrap`}>
        <Link href={ROUTES.appointmentDetail(payment.appointmentId)} className="font-semibold text-lagoon-700 underline">
          {formatAppointmentCode(payment.appointmentId)}
        </Link>
      </td>
      <td className={`${cellClass} whitespace-nowrap`}>{PAYMENT_KIND_LABELS[payment.kind]}</td>
      <td className={`${cellClass} whitespace-nowrap font-semibold tabular-nums`}>{formatMoney(payment.amount)}</td>
      <td className={cellClass}>
        <PaymentStatusBadge status={payment.status} />
      </td>
      <td className={`${cellClass} whitespace-nowrap`}>
        {isPaid ? (
          <div className="leading-[18px]">
            <span className="font-semibold">{payment.method ? PAYMENT_METHOD_LABELS[payment.method] : "–"}</span>
            {payment.paidAt && <small className="block text-xs text-muted tabular-nums">{formatPaidAt(payment.paidAt)}</small>}
          </div>
        ) : (
          <span className="text-muted">–</span>
        )}
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`} />
    </tr>
  );
}
