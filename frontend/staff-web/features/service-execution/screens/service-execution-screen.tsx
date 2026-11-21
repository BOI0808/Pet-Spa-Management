"use client";

// SW-11 Thực hiện dịch vụ – UI-Screens.md, UC-18, UC-19, FR-EXE-03, FR-EXE-04, FR-EXE-09, UF-05.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { AppointmentDetail, AppointmentStatus, Pet, PhotoKind } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-session";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment, useAppointmentPhotos } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES, appointmentDetailRoute } from "@/lib/routes";
import { formatSlotRange } from "../../appointments/appointments";
import { AfterPhotoCard, BeforePhotoCard } from "../components/photo-cards";
import { ServicesCard } from "../components/services-card";
import { describeSizeGroup, latestPhoto, petHeading, profileNote } from "../service-execution";

/** Trạng thái có màn thực hiện; lịch Chờ xác nhận / Đã xác nhận chưa tiếp nhận thì chưa có gì để làm. */
const EXECUTION_STATUSES: readonly AppointmentStatus[] = ["Received", "InProgress", "Completed", "Cancelled"];

/** Ảnh trái (hai thẻ ảnh cạnh nhau) – dịch vụ phải, rộng hơn một chút như ui-demo; màn hẹp xếp dọc. */
const splitClass = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-6 max-[1180px]:grid-cols-1";
const photoGridClass = "grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1";

export function ServiceExecutionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="mt-2 mb-6 h-4 w-96 max-w-full" />
      <div className={splitClass}>
        <div className={photoGridClass}>
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** “LH-1029. Khách Trần Minh Anh. 09:00 – 11:00. Nhóm Vừa (cân thực tế 11,2 kg).” */
function describeAppointment(appointment: AppointmentDetail) {
  return [
    `${formatAppointmentCode(appointment.appointmentId)}.`,
    appointment.customerName && `Khách ${appointment.customerName}.`,
    appointment.slotStart && `${formatSlotRange(appointment)}.`,
    describeSizeGroup(appointment),
  ]
    .filter(Boolean)
    .join(" ");
}

type ServiceExecutionViewProps = { appointment: AppointmentDetail; pet: Pet | null; petPending: boolean };

function ServiceExecutionView({ appointment, pet, petPending }: ServiceExecutionViewProps) {
  const { appointmentId, status } = appointment;
  const petName = appointment.petName ?? pet?.name ?? "thú cưng";
  const photos = useAppointmentPhotos(appointmentId);
  // Loại ảnh backend vừa báo thiếu (409 PHOTO_REQUIRED) để tô viền ô tải; có ảnh loại đó rồi thì thôi tô.
  const [photoRequired, setPhotoRequired] = useState<PhotoKind | null>(null);
  const hasBeforePhoto = latestPhoto(photos.data, "Before") !== null;
  const hasAfterPhoto = latestPhoto(photos.data, "After") !== null;

  return (
    <>
      {/* Đường dẫn thêm cấp “Thực hiện dịch vụ” (ui-demo chỉ có “Lịch hẹn › mã”) để mã lịch là liên kết về SW-03. */}
      <nav aria-label="Đường dẫn" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <li>
            <Link href={ROUTES.appointments} className="text-muted hover:text-lagoon">
              Lịch hẹn
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="chev-r" className="size-3.5" />
            <Link href={appointmentDetailRoute(appointmentId)} className="text-muted hover:text-lagoon">
              {formatAppointmentCode(appointmentId)}
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="chev-r" className="size-3.5" />
            <span aria-current="page">Thực hiện dịch vụ</span>
          </li>
        </ol>
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {petPending ? <Skeleton className="size-24 rounded-[28px]" /> : <PetAvatar species={pet?.species ?? null} size="xl" />}
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words">{petHeading(petName, pet)}</h1>
            <StatusBadge status={status} size="lg" />
          </div>
          <p className="mt-1 text-muted">{describeAppointment(appointment)}</p>
        </div>
      </div>

      {status === "Cancelled" && (
        <Alert tone="danger" title="Lịch hẹn đã hủy" className="mb-4">
          Không còn thao tác được trên lịch này.
        </Alert>
      )}
      {pet && (
        <Alert tone="neutral" icon="note" className="mb-4">
          <b>Lưu ý từ hồ sơ:</b> {profileNote(pet)}
        </Alert>
      )}

      <div className={splitClass}>
        <div className={photoGridClass}>
          <BeforePhotoCard
            appointment={appointment}
            petName={petName}
            photos={photos}
            highlighted={photoRequired === "Before" && !hasBeforePhoto}
          />
          <AfterPhotoCard
            appointment={appointment}
            petName={petName}
            photos={photos}
            highlighted={photoRequired === "After" && !hasAfterPhoto}
          />
        </div>
        <ServicesCard
          appointment={appointment}
          petName={petName}
          hasBeforePhoto={hasBeforePhoto}
          hasAfterPhoto={hasAfterPhoto}
          photosLoaded={photos.isSuccess}
          onPhotoRequired={setPhotoRequired}
        />
      </div>
    </>
  );
}

/** `/lich-hen/[appointmentId]/thuc-hien` – chỉ nhân viên spa (User-Flows 4). */
export function ServiceExecutionScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { me } = useSession();
  const isSpaStaff = me?.staffRole === "SpaStaff";
  // Tự tải lại 60 giây/lần: yêu cầu xác nhận chi phí có thể vừa được khách hoặc lễ tân phản hồi.
  const appointment = useAppointment(appointmentId, { enabled: isSpaStaff, live: true });
  const petId = appointment.data?.petId ?? "";
  const petQuery = usePet(petId, { enabled: petId !== "" });

  if (!me) return <ServiceExecutionSkeleton />;
  // Đường dẫn nằm dưới /lich-hen (cả hai vai trò vào được) nên `canAccessPath` không chặn lễ tân; màn tự chặn và giữ
  // khung trang như các màn chỉ dành cho một vai trò (User-Flows 4).
  if (!isSpaStaff) return <ForbiddenState />;
  if (appointment.isPending) return <ServiceExecutionSkeleton />;

  if (appointment.isError) {
    // Lịch không được phân công cho mình → 403, không hiện thông tin (BR-16).
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

  const detail = appointment.data;
  if (detail.type !== "Spa") {
    return (
      <NotFoundState
        title="Không có màn thực hiện cho lịch lưu trú"
        action={<ButtonLink href={appointmentDetailRoute(detail.appointmentId)}>Xem chi tiết lịch hẹn</ButtonLink>}
      />
    );
  }
  if (!EXECUTION_STATUSES.includes(detail.status)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert tone="info" title="Chưa thể thực hiện lịch này" className="w-full">
          Chờ lễ tân tiếp nhận thú cưng rồi mới tải ảnh và bắt đầu được.
        </Alert>
        <ButtonLink href={appointmentDetailRoute(detail.appointmentId)}>Xem chi tiết lịch hẹn</ButtonLink>
      </div>
    );
  }

  return <ServiceExecutionView appointment={detail} pet={petQuery.data ?? null} petPending={petQuery.isPending} />;
}
