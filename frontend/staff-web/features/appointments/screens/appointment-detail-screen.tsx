"use client";

// SW-03 Chi tiết lịch hẹn – UI-Screens.md, UC-06, UC-11, FR-EXE-01, FR-PET-02.
import { useParams } from "next/navigation";
import { Lifecycle } from "@/components/domain/lifecycle";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, type ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-session";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES, checkInRoute, checkOutRoute, serviceExecutionRoute } from "@/lib/routes";
import { getStoreToday, toStoreTime } from "@/lib/time";
import { canCheckIn, canOpenExecution, formatLongDate, formatSlotRange, lifecycleSteps } from "../appointments";
import {
  AssignmentCard,
  CustomerCard,
  HotelStayCard,
  PaymentCard,
  PetProfileCard,
  SpaServicesCard,
} from "../components/appointment-detail-cards";

const splitClass = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";

/** “Mã LH-1030. Thứ ba 06/10/2026, 12:00 – 13:00.” Giờ giữ chỗ phụ thuộc cấu hình (G-03) nên chưa hiện. */
function describeTime(appointment: AppointmentDetail) {
  const code = `Mã ${formatAppointmentCode(appointment.appointmentId)}.`;
  if (appointment.type === "Spa" && appointment.slotStart) {
    return `${code} ${formatLongDate(appointment.slotStart)}, ${formatSlotRange(appointment)}.`;
  }
  if (appointment.plannedCheckIn && appointment.plannedCheckOut) {
    return `${code} Nhận ${formatLongDate(appointment.plannedCheckIn)}, ${toStoreTime(appointment.plannedCheckIn)}; trả ${formatLongDate(appointment.plannedCheckOut)}, ${toStoreTime(appointment.plannedCheckOut)}.`;
  }
  return code;
}

/**
 * Vùng 1 – thao tác chính theo vai trò. Lễ tân, lịch Đã xác nhận có ngày hẹn (spa) hoặc ngày nhận (lưu trú) hôm nay:
 * “Tiếp nhận thú cưng” → SW-07 (lịch spa ngày khác backend trả 409 nên không hiện); lịch lưu trú Đang lưu trú → “Trả thú
 * cưng” → SW-10. Nhân viên spa: lịch Đã tiếp nhận, Đang thực hiện → “Mở màn hình thực hiện” (SW-11); lịch Đã xác nhận →
 * nút khóa kèm lý do.
 */
function PrimaryAction({ appointment, isSpaStaff }: { appointment: AppointmentDetail; isSpaStaff: boolean }) {
  if (!isSpaStaff) {
    if (appointment.type === "Hotel" && appointment.status === "InStay") {
      return (
        <ButtonLink href={checkOutRoute(appointment.appointmentId)} variant="primary" size="lg">
          Trả thú cưng
        </ButtonLink>
      );
    }
    if (!canCheckIn(appointment, getStoreToday())) return null;
    return (
      <ButtonLink href={checkInRoute(appointment.appointmentId)} variant="primary" size="lg">
        Tiếp nhận thú cưng
      </ButtonLink>
    );
  }
  if (canOpenExecution(appointment)) {
    return (
      <ButtonLink href={serviceExecutionRoute(appointment.appointmentId)} variant="primary" size="lg">
        Mở màn hình thực hiện
      </ButtonLink>
    );
  }
  if (appointment.status !== "Confirmed") return null;
  return (
    <div className="flex flex-col items-end gap-1.5 max-[640px]:items-stretch">
      <Button variant="primary" size="lg" disabled>
        Mở màn hình thực hiện
      </Button>
      <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
        <Icon name="lock" className="mt-px size-3.5" />
        Chờ lễ tân tiếp nhận thú cưng.
      </p>
    </div>
  );
}

type AppointmentDetailViewProps = {
  appointment: AppointmentDetail;
  pet: Pet | null;
  /** Đang tải hồ sơ bé (hiện khung xương); lỗi thì `petError` có giá trị. */
  petPending: boolean;
  petError: ApiError | null;
  onRetryPet: () => void;
  isSpaStaff: boolean;
};

function AppointmentDetailView({
  appointment,
  pet,
  petPending,
  petError,
  onRetryPet,
  isSpaStaff,
}: AppointmentDetailViewProps) {
  const petName = appointment.petName ?? pet?.name ?? "thú cưng";
  const title = appointment.type === "Spa" ? `Lịch spa của ${petName}` : `Lịch lưu trú của ${petName}`;

  return (
    <>
      {/* Vùng 1 như ui-demo SW-03: hình bé lớn bên trái, tiêu đề kèm badge, thao tác chính bên phải. Không dùng
          PageHeader vì nó không có chỗ cho hình và badge cạnh tiêu đề. */}
      <nav aria-label="Đường dẫn" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <li>
            <Link href={ROUTES.appointments} className="text-muted hover:text-lagoon">
              Lịch hẹn
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="chev-r" className="size-3.5" />
            <span aria-current="page">{formatAppointmentCode(appointment.appointmentId)}</span>
          </li>
        </ol>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {petPending ? <Skeleton className="size-24 rounded-[28px]" /> : <PetAvatar species={pet?.species ?? null} size="xl" />}
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words">{title}</h1>
            <StatusBadge status={appointment.status} size="lg" />
          </div>
          <p className="mt-1 text-muted">{describeTime(appointment)}</p>
        </div>
        <PrimaryAction appointment={appointment} isSpaStaff={isSpaStaff} />
      </div>

      <Card className="mb-4">
        <CardBody>
          <Lifecycle steps={lifecycleSteps(appointment)} label="Các bước của lịch hẹn" />
        </CardBody>
      </Card>

      <div className={splitClass}>
        <div className="flex min-w-0 flex-col gap-4">
          <PetProfileCard pet={pet} error={petError} onRetry={onRetryPet} isSpaStaff={isSpaStaff} />
          {appointment.type === "Spa" ? (
            <SpaServicesCard appointment={appointment} pet={pet} />
          ) : (
            <HotelStayCard appointment={appointment} />
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <CustomerCard appointment={appointment} />
          {appointment.type === "Spa" && <AssignmentCard appointment={appointment} />}
          <PaymentCard appointment={appointment} pet={pet} />
        </aside>
      </div>
    </>
  );
}

export function AppointmentDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="mt-2 mb-6 h-4 w-96 max-w-full" />
      <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
      <div className={splitClass}>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** `/lich-hen/[appointmentId]`. */
export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { me } = useSession();
  const appointment = useAppointment(appointmentId, { live: true });
  // Backend cho nhân viên spa xem hồ sơ bé của lịch được phân công (BR-16). Lỗi thì vẫn hiện lịch; thẻ hồ sơ báo lỗi
  // kèm nút Thử lại, giá dịch vụ không tra được (cần loài) nên Tạm tính hiện “—”.
  const petId = appointment.data?.petId ?? "";
  const petQuery = usePet(petId, { enabled: petId !== "" });

  if (appointment.isPending || !me) return <AppointmentDetailSkeleton />;

  if (appointment.isError) {
    // Nhân viên spa mở lịch không được phân công → 403, không hiện thông tin (FR-EXE-01, BR-16).
    if (isForbiddenError(appointment.error)) return <ForbiddenState />;
    if (appointment.error.status === 404 || appointment.error.status === 400) {
      return (
        <NotFoundState
          title="Không tìm thấy lịch hẹn"
          action={<ButtonLink href={ROUTES.appointments}>Về danh sách lịch hẹn</ButtonLink>}
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

  return (
    <AppointmentDetailView
      appointment={appointment.data}
      pet={petQuery.data ?? null}
      petPending={petQuery.isPending}
      petError={petQuery.error}
      onRetryPet={() => void petQuery.refetch()}
      isSpaStaff={me.staffRole === "SpaStaff"}
    />
  );
}
