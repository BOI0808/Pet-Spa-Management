"use client";

// CW-09 Chi tiết lịch hẹn: theo dõi trạng thái (vùng 1, 2, 4, 6, 7) – UI-Screens.md
// Phần còn lại của màn làm ở thẻ khác: đổi/hủy (vùng 8) – [112]; ảnh trước/sau (vùng 5) – [113];
// xác nhận chi phí mới (vùng 3) – [114]; thanh toán trực tuyến và kết quả (vùng 7 nút, vùng 9) – [116].
import { useParams } from "next/navigation";
import { Lifecycle } from "@/components/domain/lifecycle";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import { Breadcrumb } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import {
  cancelReasonText,
  formatLongDate,
  formatSlotRange,
  formatTimeOnDate,
  lifecycleSteps,
} from "../appointments";
import { AppointmentInfoCard, HotelStayCard, PaymentCard, SpaServicesCard } from "../components/appointment-detail-cards";

/** Bố cục 2 cột (`.split` của ui-demo): nội dung chính trái, thẻ phụ phải 360px; dưới 1180px còn 1 cột. */
const splitClass = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";

/** “Mã LH-…. Thứ ba 06/10/2026, 09:00 – 11:00.” / “Mã LH-…. Nhận 08:00 thứ sáu 09/10/2026, trả 17:00 chủ nhật 11/10/2026.” */
function headerDescription(appointment: AppointmentDetail) {
  const code = `Mã ${formatAppointmentCode(appointment.appointmentId)}.`;
  if (appointment.type === "Spa" && appointment.slotStart) {
    return `${code} ${formatLongDate(appointment.slotStart)}, ${formatSlotRange(appointment)}.`;
  }
  if (appointment.plannedCheckIn && appointment.plannedCheckOut) {
    const checkIn = `${toStoreTime(appointment.plannedCheckIn)} ${formatLongDate(appointment.plannedCheckIn).toLocaleLowerCase("vi-VN")}`;
    const checkOut = `${toStoreTime(appointment.plannedCheckOut)} ${formatLongDate(appointment.plannedCheckOut).toLocaleLowerCase("vi-VN")}`;
    return `${code} Nhận ${checkIn}, trả ${checkOut}.`;
  }
  return code;
}

function DetailHeader({ appointment, pet }: { appointment: AppointmentDetail; pet: Pet | null }) {
  const petName = appointment.petName ?? pet?.name ?? "thú cưng";
  return (
    <div className="mb-6 flex items-center gap-4 max-[640px]:items-start">
      <PetAvatar species={pet?.species ?? null} size="xl" className="max-[640px]:size-[72px]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words">
            {appointment.type === "Spa" ? "Lịch spa" : "Lịch lưu trú"} của {petName}
          </h1>
          <StatusBadge status={appointment.status} size="lg" />
        </div>
        <p className="mt-1 text-muted">{headerDescription(appointment)}</p>
      </div>
    </div>
  );
}

function AppointmentDetailView({ appointment, pet }: { appointment: AppointmentDetail; pet: Pet | null }) {
  const isCancelled = appointment.status === "Cancelled";
  const petName = appointment.petName ?? pet?.name ?? "bé";
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Lịch hẹn của tôi", href: ROUTES.appointments },
          { label: formatAppointmentCode(appointment.appointmentId) },
        ]}
      />
      <DetailHeader appointment={appointment} pet={pet} />

      {/* Vùng 2 – vòng đời */}
      <Card className="mb-4">
        <CardBody>
          <Lifecycle label="Tiến trình lịch hẹn" steps={lifecycleSteps(appointment)} />
        </CardBody>
      </Card>

      {/* Vùng 8 (phần lịch đã hủy) */}
      {isCancelled && (
        <Alert tone="neutral" className="mb-4">
          {appointment.cancelledAt ? `Lịch hẹn đã hủy lúc ${formatTimeOnDate(appointment.cancelledAt)}. ` : "Lịch hẹn đã hủy. "}
          Lý do: <b>{cancelReasonText(appointment.cancelReason)}</b>.
        </Alert>
      )}

      <div className={splitClass}>
        <div className="flex min-w-0 flex-col gap-4">
          {appointment.type === "Spa" ? (
            <SpaServicesCard appointment={appointment} pet={pet} />
          ) : (
            <HotelStayCard appointment={appointment} pet={pet} />
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <AppointmentInfoCard appointment={appointment} pet={pet} />
          <PaymentCard appointment={appointment} pet={pet} />
          {isCancelled && appointment.type === "Spa" && (
            <ButtonLink href={ROUTES.spaBookingForPet(appointment.petId)} variant="secondary">
              <Icon name="refresh" />
              Đặt lại lịch cho {petName}
            </ButtonLink>
          )}
        </aside>
      </div>
    </>
  );
}

export function AppointmentDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="size-24 rounded-[28px]" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
      </div>
      <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
      <div className={splitClass}>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const appointment = useAppointment(appointmentId, { live: true });
  // GET /pets/{id} (không phải GET /pets) để lịch cũ của hồ sơ đã gỡ vẫn có loài, giống và giá.
  // Lỗi thì vẫn hiện lịch với tên từ `petName`, không có giá theo loài.
  const petId = appointment.data?.petId ?? "";
  const petQuery = usePet(petId, { enabled: petId !== "" });

  if (appointment.isPending) return <AppointmentDetailSkeleton />;

  if (appointment.isError) {
    // Lịch của khách khác → 403, không hiện thông tin (FR-BOOK-04, BR-16).
    if (isForbiddenError(appointment.error)) return <ForbiddenState />;
    if (appointment.error.status === 404 || appointment.error.status === 400) {
      return (
        <NotFoundState
          title="Không tìm thấy lịch hẹn"
          action={<ButtonLink href={ROUTES.appointments}>Về lịch hẹn của tôi</ButtonLink>}
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={appointment.error} className="w-full" />
        <Button onClick={() => void appointment.refetch()}>Thử lại</Button>
      </div>
    );
  }

  const pet = petQuery.data ?? null;
  return <AppointmentDetailView appointment={appointment.data} pet={pet} />;
}
