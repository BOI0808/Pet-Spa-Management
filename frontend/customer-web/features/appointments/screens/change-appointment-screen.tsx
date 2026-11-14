"use client";

// CW-10 Đổi lịch hẹn – UI-Screens.md, UC-14, FR-CHG-01, FR-CHG-02, BR-08, BR-26.
import { useParams, useRouter } from "next/navigation";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { useToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { formatAppointmentCode } from "@/lib/format";
import { useChangeWindowClosed } from "@/lib/queries/appointment-changes";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet, usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { CHANGE_LOCKED_MESSAGE, getChangeAccess, useNow } from "../change-window";
import { HotelChangeForm } from "../components/hotel-change-form";
import { SpaChangeForm } from "../components/spa-change-form";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
const DESCRIPTION = "Bạn có thể đổi thú cưng, dịch vụ, ngày giờ. Lịch đổi xong quay về Chờ xác nhận để cửa hàng duyệt lại.";

export function ChangeAppointmentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="mb-2 h-4 w-64 max-w-full" />
      <Skeleton className="mb-6 h-8 w-56 max-w-full" />
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function ChangeAppointmentScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { showError } = useToast();
  const now = useNow();
  const knownClosed = useChangeWindowClosed(appointmentId);
  const appointment = useAppointment(appointmentId);
  const pets = usePets(PET_LIST_PARAMS);
  const petId = appointment.data?.petId ?? "";
  const currentPet = usePet(petId, { enabled: petId !== "" });

  const code = formatAppointmentCode(appointmentId);
  const breadcrumb = [
    { label: "Lịch hẹn của tôi", href: ROUTES.appointments },
    { label: code, href: ROUTES.appointmentDetail(appointmentId) },
    { label: "Đổi lịch" },
  ];
  const header = <PageHeader title="Đổi lịch hẹn" description={DESCRIPTION} breadcrumb={breadcrumb} />;

  /** 409 `CHANGE_WINDOW_CLOSED`: về CW-09 ở trạng thái quá hạn kèm lỗi (UI-Screens CW-10). */
  function handleWindowClosed(error: unknown) {
    showError(error);
    router.replace(ROUTES.appointmentDetail(appointmentId));
  }

  if (appointment.isPending || pets.isPending) return <ChangeAppointmentSkeleton />;

  if (appointment.isError) {
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
      <>
        {header}
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={appointment.error} className="w-full" />
          <Button onClick={() => void appointment.refetch()}>Thử lại</Button>
        </div>
      </>
    );
  }

  if (pets.isError) {
    return (
      <>
        {header}
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={pets.error} className="w-full" />
          <Button onClick={() => void pets.refetch()}>Thử lại</Button>
        </div>
      </>
    );
  }

  const detail = appointment.data;
  const backToDetail = (
    <ButtonLink href={ROUTES.appointmentDetail(appointmentId)} variant="secondary">
      Về chi tiết lịch hẹn
    </ButtonLink>
  );

  // Mở thẳng đường dẫn khi lịch không còn đổi được (đã tiếp nhận, đã hủy, quá hạn): không hiện form (FR-CHG-02).
  const access = getChangeAccess(detail, now, knownClosed);
  if (access !== "open") {
    const message =
      access === "hidden"
        ? `Lịch hẹn ${code} đã ${detail.status === "Cancelled" ? "hủy" : "hoàn tất"}, không thể đổi lịch.`
        : CHANGE_LOCKED_MESSAGE;
    return (
      <>
        {header}
        <Alert tone="neutral" icon="lock" className="mb-4">
          {message}
        </Alert>
        {backToDetail}
      </>
    );
  }

  if (pets.data.items.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState title="Chưa có thú cưng" description="Hồ sơ thú cưng của lịch này đã được gỡ." action={backToDetail} />
        </Card>
      </>
    );
  }

  const formProps = {
    appointment: detail,
    pets: pets.data.items,
    currentPet: currentPet.data ?? null,
    onWindowClosed: handleWindowClosed,
  };

  return (
    <>
      {header}
      {detail.type === "Spa" ? <SpaChangeForm {...formProps} /> : <HotelChangeForm {...formProps} />}
    </>
  );
}
