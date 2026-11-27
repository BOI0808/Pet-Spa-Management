"use client";

// SW-10 Trả thú cưng lưu trú – UI-Screens.md, UC-32, FR-HTL-09, BR-07, BR-22, UF-03 (thẻ 127). Chỉ lễ tân.
// `?appointmentId=` (từ SW-08, SW-02, SW-03, SW-07 hoặc quay về từ SW-09 sau khi thu phí trễ) → thẻ trả thú cưng;
// không có thì hiện các bé đang lưu trú để chọn (Đề xuất).
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { useAppointment, useAppointments } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { checkOutRoute } from "@/lib/routes";
import { getStoreToday, toStoreDate } from "@/lib/time";
import { formatStayMoment, IN_STAY_PARAMS } from "@/features/cages/cages";
import { sortByPlannedCheckOut } from "../check-out";
import { CheckOutCard } from "../components/check-out-card";

const DESCRIPTION = "Ghi nhận giờ đón thực tế, thu phí trả muộn nếu có, rồi bàn giao bé.";

function SelectedPanel({ appointmentId }: { appointmentId: string }) {
  // `live`: lễ tân có thể để màn mở lúc khách đi thu phí ở quầy khác; tải lại để thấy trạng thái mới.
  const appointment = useAppointment(appointmentId, { live: true });
  const petId = appointment.data?.petId ?? "";
  const pet = usePet(petId, { enabled: petId !== "" });

  if (appointment.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (appointment.isError) {
    if (isForbiddenError(appointment.error)) return <ForbiddenState />;
    if (appointment.error.status === 404 || appointment.error.status === 400) {
      return <NotFoundState title="Không tìm thấy lịch hẹn" />;
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={appointment.error} className="w-full" />
        <Button onClick={() => void appointment.refetch()}>Thử lại</Button>
      </div>
    );
  }
  if (appointment.data.type !== "Hotel") {
    return <NotFoundState title="Lịch này không phải lịch lưu trú" />;
  }
  return <CheckOutCard appointment={appointment.data} pet={pet.data ?? null} />;
}

function StayRow({ stay, today }: { stay: Appointment; today: string }) {
  const pet = usePet(stay.petId);
  const dueDate = stay.plannedCheckOut ? toStoreDate(stay.plannedCheckOut) : null;
  return (
    <li>
      <Link
        href={checkOutRoute(stay.appointmentId)}
        className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-ink transition-colors hover:border-[#9ec4c9]"
      >
        <PetAvatar species={pet.data?.species ?? null} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{stay.petName ?? pet.data?.name ?? "Thú cưng"}</span>
          <span className="block truncate text-xs text-muted">Chủ: {stay.customerName ?? "—"}</span>
        </span>
        <span className="flex flex-col items-end gap-1 text-right text-xs text-muted">
          {stay.plannedCheckOut && <span>Trả dự kiến {formatStayMoment(stay.plannedCheckOut, today)}</span>}
          {dueDate !== null && dueDate === today && <Tag tone="warn">Trả hôm nay</Tag>}
          {dueDate !== null && dueDate < today && <Tag tone="warn">Quá hạn trả</Tag>}
        </span>
      </Link>
    </li>
  );
}

/** Không có `?appointmentId=`: mọi bé đang lưu trú, giờ trả sớm nhất trước (Đề xuất). */
function StayPicker() {
  const today = getStoreToday();
  const stays = useAppointments(IN_STAY_PARAMS);

  let content;
  if (stays.isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải danh sách bé đang lưu trú" className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  } else if (stays.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={stays.error} className="w-full" />
        <Button size="sm" onClick={() => void stays.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  } else if (stays.data.items.length === 0) {
    content = <EmptyState title="Không có bé nào đang lưu trú." icon="bed" className="py-6" />;
  } else {
    content = (
      <ul className="flex flex-col gap-2">
        {sortByPlannedCheckOut(stays.data.items).map((stay) => (
          <StayRow key={stay.appointmentId} stay={stay} today={today} />
        ))}
      </ul>
    );
  }

  return (
    <Card className="max-w-[720px]">
      <CardHeader title="Chọn bé cần trả">
        {stays.data && <span className="text-[13px] text-muted">{stays.data.items.length} bé đang lưu trú</span>}
      </CardHeader>
      <CardBody className="p-3">{content}</CardBody>
    </Card>
  );
}

/** `/tra-thu-cung` (`?appointmentId=`). */
export function CheckOutScreen() {
  const appointmentId = useSearchParams().get("appointmentId");
  return (
    <>
      <PageHeader title="Trả thú cưng lưu trú" description={DESCRIPTION} />
      {appointmentId ? <SelectedPanel key={appointmentId} appointmentId={appointmentId} /> : <StayPicker />}
    </>
  );
}
