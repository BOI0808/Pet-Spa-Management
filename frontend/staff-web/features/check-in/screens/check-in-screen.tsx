"use client";

// SW-07 Tiếp nhận thú cưng – UI-Screens.md, UC-16, FR-EXE-02, FR-EXE-10, FR-EXE-11, UF-03, UF-10. Thẻ 125 làm phần
// lịch spa; thẻ 126 thêm đối chiếu cân nặng lịch lưu trú và ghi nhận phản hồi chi phí mới; thu tiền lưu trú, đưa vào
// chuồng ở thẻ 128, 127.
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { formatFullDate } from "@/lib/format";
import { useAppointment, useAppointments } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { checkInRoute } from "@/lib/routes";
import { getStoreToday } from "@/lib/time";
import { canCheckIn, sortByRowMoment } from "@/features/appointments/appointments";
import { HotelCheckInCard } from "../components/hotel-check-in-card";
import { SpaCheckInCard, type CheckInOutcome } from "../components/spa-check-in-card";
import { TodayList } from "../components/today-list";

/** Lịch spa Đã xác nhận tiếp theo (sau lịch đang chọn) để nút “Tiếp nhận lịch tiếp theo” có chỗ đến. */
function nextCheckInHref(items: Appointment[], currentId: string, today: string) {
  const index = items.findIndex((item) => item.appointmentId === currentId);
  const next = [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))].find(
    (item) => item.appointmentId !== currentId && canCheckIn(item, today),
  );
  return next ? checkInRoute(next.appointmentId) : null;
}

function SelectedPanel({
  appointmentId,
  items,
  today,
  outcome,
  onCheckedIn,
}: {
  appointmentId: string;
  items: Appointment[];
  today: string;
  outcome: CheckInOutcome | null;
  onCheckedIn: (outcome: CheckInOutcome) => void;
}) {
  const appointment = useAppointment(appointmentId);
  const petId = appointment.data?.petId ?? "";
  const pet = usePet(petId, { enabled: petId !== "" });

  if (appointment.isPending) return <Skeleton className="h-80 w-full rounded-2xl" />;
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

  if (appointment.data.type === "Hotel") {
    // `key`: đổi sang lịch khác thì bỏ kết quả đối chiếu, ô cân nặng của lịch trước.
    return <HotelCheckInCard key={appointmentId} appointment={appointment.data} pet={pet.data ?? null} />;
  }

  return (
    <SpaCheckInCard
      key={appointmentId}
      appointment={appointment.data}
      pet={pet.data ?? null}
      outcome={outcome}
      onCheckedIn={onCheckedIn}
      nextHref={nextCheckInHref(items, appointmentId, today)}
    />
  );
}

/** `/tiep-nhan` (`?appointmentId=`). */
export function CheckInScreen() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("appointmentId");
  const today = getStoreToday();
  // Cùng khóa với SW-02 của lễ tân hôm nay nên quay qua lại giữa hai màn không phải tải lại.
  const list = useAppointments({ date: today, sort: "time_asc", page: 1, pageSize: 100 });
  const items = list.data ? sortByRowMoment(list.data.items, today) : [];
  // Kết quả lần tiếp nhận vừa làm: sau khi gửi, chi tiết tải lại thành Đã tiếp nhận nên phải giữ kết quả ở đây.
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);

  const listError = list.isError ? (
    <div className="flex flex-col items-start gap-3">
      <ErrorAlert error={list.error} className="w-full" />
      <Button size="sm" onClick={() => void list.refetch()}>
        Thử lại
      </Button>
    </div>
  ) : null;

  return (
    <>
      <PageHeader title="Tiếp nhận thú cưng" description={formatFullDate(today)} />
      <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-6 max-[980px]:grid-cols-1">
        <TodayList
          appointments={list.data ? items : undefined}
          isPending={list.isPending}
          error={listError}
          selectedId={selectedId}
          today={today}
        />
        <div className="min-w-0">
          {selectedId ? (
            <SelectedPanel
              // Đổi lịch thì dựng lại thẻ để ô cân nặng và lỗi của lịch trước không còn.
              key={selectedId}
              appointmentId={selectedId}
              items={items}
              today={today}
              outcome={outcome}
              onCheckedIn={setOutcome}
            />
          ) : (
            <Card>
              <EmptyState title="Chọn một lịch hẹn trong danh sách để tiếp nhận." icon="clipboard" />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
