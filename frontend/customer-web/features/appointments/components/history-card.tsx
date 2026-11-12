"use client";

// Một thẻ lịch đã hoàn tất trong CW-11 (vùng 2, 3) – UI-Screens.md
import Link from "next/link";
import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatMoney } from "@/lib/format";
import { useAppointment, useAppointmentPayments } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import { toStoreDate } from "@/lib/time";
import {
  appointmentStart,
  describePayment,
  findPayment,
  formatDayMonthTime,
  formatSlotRange,
  nightsOf,
  paymentMethodText,
  serviceNames,
  staffNames,
} from "../appointments";
import { useInViewOnce } from "../use-in-view";

function LineSkeleton() {
  return <Skeleton className="mt-1.5 h-3.5 w-56 max-w-full" />;
}

/** Spa: dịch vụ, nhân viên (từ chi tiết – G-05), số tiền và phương thức. Ảnh trước/sau làm ở thẻ [113]. */
function SpaSummary({ appointment, enabled }: { appointment: Appointment; enabled: boolean }) {
  const detail = useAppointment(appointment.appointmentId, { enabled });
  const payments = useAppointmentPayments(appointment.appointmentId, { enabled });
  const spaPayment = findPayment(payments.data, "Spa");
  const staff = detail.data ? staffNames(detail.data) : [];
  const services = detail.data ? serviceNames(detail.data) : [];
  const note = [staff.length > 0 ? `Nhân viên ${staff.join(", ")}.` : "", spaPayment ? describePayment(spaPayment) : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {detail.isPending && enabled ? (
        <LineSkeleton />
      ) : (
        services.length > 0 && <div className="mt-1 break-words font-semibold">{services.join(", ")}</div>
      )}
      {payments.isPending && enabled ? (
        <LineSkeleton />
      ) : (
        note && <div className="mt-1 break-words text-xs text-muted">{note}</div>
      )}
    </>
  );
}

/** Lưu trú: giờ nhận, trả; tiền lưu trú, phương thức, phí trả muộn. Mã chuồng chưa có trong API (G-05). */
function HotelSummary({ appointment, enabled }: { appointment: Appointment; enabled: boolean }) {
  const payments = useAppointmentPayments(appointment.appointmentId, { enabled });
  const checkOut = appointment.actualCheckOut ?? appointment.plannedCheckOut;
  const stay = findPayment(payments.data, "Stay");
  const lateFee = findPayment(payments.data, "LateFee");

  let note = "";
  if (stay) {
    const method = stay.status === "Paid" ? paymentMethodText(stay.method) : "chưa thanh toán";
    note = `Tiền lưu trú ${formatMoney(stay.amount)}${method ? `, ${method}` : ""}.`;
  }
  if (payments.data) {
    note += lateFee
      ? ` Phí trả muộn ${formatMoney(lateFee.amount)}${lateFee.status === "Paid" ? "" : ", chưa thanh toán"}.`
      : " Không phát sinh phí trả muộn.";
  }

  return (
    <>
      {appointment.plannedCheckIn && checkOut && (
        <div className="mt-1 break-words font-semibold">
          Nhận {formatDayMonthTime(appointment.plannedCheckIn)}, trả {formatDayMonthTime(checkOut)}.
        </div>
      )}
      {payments.isPending && enabled ? (
        <LineSkeleton />
      ) : (
        note && <div className="mt-1 break-words text-xs text-muted">{note.trim()}</div>
      )}
    </>
  );
}

export function HistoryCard({ appointment }: { appointment: Appointment }) {
  const [ref, inView] = useInViewOnce<HTMLLIElement>();
  const isSpa = appointment.type === "Spa";
  // Cột trái: ngày + khung giờ (spa) hoặc ngày trả + số đêm (lưu trú).
  const dateSource = isSpa
    ? appointmentStart(appointment)
    : (appointment.actualCheckOut ?? appointment.plannedCheckOut ?? appointmentStart(appointment));
  const nights = nightsOf(appointment);
  const code = formatAppointmentCode(appointment.appointmentId);

  return (
    <li ref={ref}>
      <Card>
        <div className="flex items-start gap-5 p-5 max-[640px]:flex-col max-[640px]:gap-2">
          <div className="w-[110px] shrink-0 max-[640px]:w-auto">
            <div className="font-semibold tabular-nums">{formatDate(toStoreDate(dateSource))}</div>
            <div className="text-xs text-muted">
              {isSpa ? formatSlotRange(appointment) : nights !== null ? `${nights} đêm` : ""}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <AppointmentTypeLabel type={appointment.type} />
              <Link
                href={ROUTES.appointmentDetail(appointment.appointmentId)}
                className="text-xs text-muted underline-offset-2 hover:text-lagoon hover:underline"
                aria-label={`Xem chi tiết lịch ${code}`}
              >
                {code}
              </Link>
              <StatusBadge status={appointment.status} />
            </div>
            {isSpa ? (
              <SpaSummary appointment={appointment} enabled={inView} />
            ) : (
              <HotelSummary appointment={appointment} enabled={inView} />
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}
