"use client";

// Một phiếu hẹn trong CW-08 vùng 4 – UI-Screens.md
import { useQueryClient } from "@tanstack/react-query";
import { AppointmentTicket } from "@/components/domain/appointment-ticket";
import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Countdown } from "@/components/feedback/countdown";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { Appointment, AppointmentDetail, CostConfirmation, Payment, Pet } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney } from "@/lib/format";
import { appointmentKeys, useAppointment, useAppointmentPayments } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import {
  cancelReasonText,
  describePayment,
  describeStay,
  findPayment,
  serviceNames,
  staffNames,
  ticketStub,
  type AppointmentTab,
} from "../appointments";
import { useInViewOnce } from "../use-in-view";

type AppointmentListTicketProps = {
  appointment: Appointment;
  /** Hồ sơ thú cưng (để lấy loài); null khi hồ sơ đã gỡ. */
  pet: Pet | null;
  tab: AppointmentTab;
  today: string;
};

/** Lịch spa: dịch vụ + nhân viên (lấy từ chi tiết lịch – G-05), thêm tiền khi đã hoàn tất. */
function spaDescription(detail: AppointmentDetail, payments: Payment[] | undefined) {
  const services = serviceNames(detail);
  const staff = staffNames(detail);
  const spaPayment = findPayment(payments, "Spa");
  return [
    services.length > 0 ? `${services.join(", ")}.` : "",
    staff.length > 0 ? `Nhân viên ${staff.join(", ")}.` : "",
    spaPayment ? describePayment(spaPayment) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Lịch lưu trú: số đêm, giờ nhận/trả, tiền lưu trú. Mã chuồng chưa có trong API (G-05) nên ẩn. */
function hotelDescription(appointment: Appointment, payments: Payment[] | undefined) {
  const stay = findPayment(payments, "Stay");
  let payment = "";
  if (stay) {
    payment =
      stay.status === "Paid"
        ? `Đã thanh toán tiền lưu trú ${formatMoney(stay.amount)}.`
        : `Tiền lưu trú ${formatMoney(stay.amount)} trả tại quầy khi gửi bé.`;
  }
  return [describeStay(appointment), payment].filter(Boolean).join(" ");
}

/** “Cần bạn xác nhận chi phí mới, còn mm:ss”; hết giờ thì tải lại danh sách và chi tiết (SA 6.6). */
function CostConfirmationTag({ pending }: { pending: CostConfirmation }) {
  const queryClient = useQueryClient();
  return (
    <Tag tone="warn" wrap>
      <Icon name="alert" className="size-3.5" />
      <span>
        Cần bạn xác nhận chi phí mới, còn{" "}
        <Countdown
          plain
          expiresAt={pending.expiresAt}
          onExpire={() => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all })}
        />
      </span>
    </Tag>
  );
}

export function AppointmentListTicket({ appointment, pet, tab, today }: AppointmentListTicketProps) {
  // Chi tiết và thanh toán của từng phiếu chỉ tải khi phiếu hiện ra (G-05).
  const [ref, inView] = useInViewOnce<HTMLLIElement>();
  const isCancelled = appointment.status === "Cancelled";
  const isSpa = appointment.type === "Spa";
  const detail = useAppointment(appointment.appointmentId, { enabled: inView && isSpa && !isCancelled });
  // Spa chỉ có khoản sau khi hoàn tất; lưu trú có tiền lưu trú từ khi xác nhận.
  const payments = useAppointmentPayments(appointment.appointmentId, {
    enabled: inView && !isCancelled && (!isSpa || appointment.status === "Completed"),
  });

  let description;
  if (isCancelled) description = `Lý do hủy: ${cancelReasonText(appointment.cancelReason)}.`;
  else if (!isSpa) description = hotelDescription(appointment, payments.data);
  else if (detail.data) description = spaDescription(detail.data, payments.data) || undefined;
  // Lỗi khi tải phần phụ: phiếu vẫn có thời gian, trạng thái; không chặn cả danh sách.
  else if (!detail.isError) description = <Skeleton className="mt-1 h-3.5 w-48 max-w-full" />;

  const pending = detail.data?.pendingCostConfirmation;
  const petName = appointment.petName ?? pet?.name ?? "Thú cưng";

  return (
    <li ref={ref}>
      <AppointmentTicket
        href={ROUTES.appointmentDetail(appointment.appointmentId)}
        stub={ticketStub(appointment, tab, today)}
        media={<PetAvatar species={pet?.species ?? null} />}
        title={
          <>
            <span className="break-words">{petName}</span>
            <AppointmentTypeLabel type={appointment.type} />
          </>
        }
        description={description}
        alert={pending?.status === "Pending" ? <CostConfirmationTag pending={pending} /> : undefined}
        side={
          <>
            <StatusBadge status={appointment.status} />
            <span className="text-xs text-muted">{formatAppointmentCode(appointment.appointmentId)}</span>
          </>
        }
      />
    </li>
  );
}
