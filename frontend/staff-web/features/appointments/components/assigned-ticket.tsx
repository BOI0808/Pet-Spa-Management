"use client";

import { AppointmentTicket } from "@/components/domain/appointment-ticket";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { Appointment } from "@/lib/api/types";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { appointmentDetailRoute } from "@/lib/routes";
import { describePetKind, serviceNames, ticketStub } from "../appointments";

type AssignedTicketProps = {
  appointment: Appointment;
  today: string;
  /** Phiếu “Sắp tới” rút gọn: không có thẻ cảnh báo, ghi chú hồ sơ (UI-Screens SW-02 vùng 6). */
  compact?: boolean;
};

/**
 * Một phiếu hẹn của nhân viên spa (UI-Screens SW-02 vùng 5, 6). Danh sách không có dịch vụ, giống loài, ghi chú
 * (G-05) nên mỗi phiếu tải thêm chi tiết lịch và hồ sơ bé; backend chỉ cho xem hồ sơ của lịch được phân công.
 * Cả phiếu là liên kết sang SW-03; màn thực hiện SW-11 làm ở thẻ 131.
 */
export function AssignedTicket({ appointment, today, compact = false }: AssignedTicketProps) {
  const detail = useAppointment(appointment.appointmentId);
  const pet = usePet(appointment.petId);

  const petName = appointment.petName ?? pet.data?.name ?? "Thú cưng";
  const services = detail.data ? serviceNames(detail.data) : [];
  let description;
  if (services.length > 0) description = services.join(", ");
  // Lỗi khi tải phần phụ: phiếu vẫn có giờ, tên, trạng thái; không chặn cả danh sách.
  else if (detail.isPending) description = <Skeleton className="mt-1 h-3.5 w-48 max-w-full" />;

  const alerts = [];
  if (!compact) {
    if (detail.data?.pendingCostConfirmation?.status === "Pending") {
      alerts.push(
        <Tag key="cost" tone="warn" wrap>
          <Icon name="alert" className="size-3.5" />
          Chờ khách xác nhận chi phí mới
        </Tag>,
      );
    } else if (appointment.status === "Confirmed") {
      alerts.push(
        <Tag key="wait" wrap>
          Chờ lễ tân tiếp nhận
        </Tag>,
      );
    }
    // Ghi chú hồ sơ (tiền sử bệnh, lưu ý chăm sóc) để nhân viên đọc trước khi nhận bé.
    if (pet.data?.notes) {
      alerts.push(
        <Tag key="notes" tone="warn" wrap>
          <Icon name="info" className="size-3.5" />
          {pet.data.notes}
        </Tag>,
      );
    }
  }

  return (
    <li>
      <AppointmentTicket
        href={appointmentDetailRoute(appointment.appointmentId)}
        stub={ticketStub(appointment, today)}
        media={pet.data ? <PetAvatar species={pet.data.species} /> : <Skeleton className="size-11 rounded-[14px]" />}
        title={
          <>
            <span className="break-words">{petName}</span>
            {pet.data && <span className="text-[13px] font-normal text-muted">{describePetKind(pet.data)}</span>}
          </>
        }
        description={description}
        alert={alerts.length > 0 ? <div className="flex flex-wrap gap-1.5">{alerts}</div> : undefined}
        side={<StatusBadge status={appointment.status} />}
      />
    </li>
  );
}
