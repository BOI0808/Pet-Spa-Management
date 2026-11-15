"use client";

// SW-02 Lịch hẹn – phần nhân viên spa (UI-Screens SW-02 vùng 4 → 6, FR-EXE-01, UF-05).
import type { ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError } from "@/lib/api/errors";
import { formatFullDate } from "@/lib/format";
import { useAppointments } from "@/lib/queries/appointments";
import { getStoreToday } from "@/lib/time";
import { todayItems, upcomingItems } from "../appointments";
import { AssignedTicket } from "../components/assigned-ticket";

// Sắp tới: 20 lịch Đã xác nhận gần nhất theo giờ (UI-Screens SW-02 vùng 6).
const UPCOMING_PAGE_SIZE = 20;

function SectionTitle({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 id={id}>{title}</h2>
      {count !== undefined && <span className="text-[13px] text-muted">{count} lịch</span>}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải lịch hẹn" className="flex flex-col gap-3">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-[92px] rounded-2xl" />
      ))}
    </div>
  );
}

function LoadError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorAlert error={error} className="w-full" />
      <Button onClick={onRetry}>Thử lại</Button>
    </div>
  );
}

export function AssignedAppointmentsScreen() {
  // Tính lại mỗi lần vẽ (danh sách tải lại 60 giây/lần): mở màn qua nửa đêm thì “Hôm nay” vẫn đúng ngày.
  const today = getStoreToday();
  // Backend chỉ trả lịch đang phân công cho chính nhân viên này (BR-16), lọc theo ngày và sắp theo giờ hẹn.
  const todayList = useAppointments({ type: "Spa", date: today, sort: "time_asc", page: 1, pageSize: 100 });
  const upcomingList = useAppointments({
    type: "Spa",
    status: "Confirmed",
    sort: "time_asc",
    page: 1,
    pageSize: UPCOMING_PAGE_SIZE,
  });

  let todayContent: ReactNode;
  let todayCount: number | undefined;
  if (todayList.isPending) {
    todayContent = <ListSkeleton />;
  } else if (todayList.isError) {
    todayContent = <LoadError error={todayList.error} onRetry={() => void todayList.refetch()} />;
  } else {
    const items = todayItems(todayList.data.items);
    todayCount = items.length;
    todayContent =
      items.length === 0 ? (
        <Card>
          <EmptyState
            title="Hôm nay bạn chưa được phân công lịch nào."
            description="Lịch mới hiện ở đây khi quản lý xác nhận và xếp bạn vào lịch."
            icon="calendar"
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((appointment) => (
            <AssignedTicket key={appointment.appointmentId} appointment={appointment} today={today} />
          ))}
        </ul>
      );
  }

  // Mục Sắp tới chỉ hiện khi có lịch; đang tải thì không chiếm chỗ, lỗi thì báo để thử lại.
  let upcomingContent: ReactNode = null;
  if (upcomingList.isError) {
    upcomingContent = <LoadError error={upcomingList.error} onRetry={() => void upcomingList.refetch()} />;
  } else if (upcomingList.data) {
    const items = upcomingItems(upcomingList.data.items, today);
    if (items.length > 0) {
      upcomingContent = (
        <ul className="flex flex-col gap-3">
          {items.map((appointment) => (
            <AssignedTicket key={appointment.appointmentId} appointment={appointment} today={today} compact />
          ))}
        </ul>
      );
    }
  }

  return (
    <>
      {/* Ca làm hôm nay không hiện: nhân viên spa chưa đọc được ca của mình (G-18). */}
      <PageHeader title="Lịch được phân công cho bạn" description={`${formatFullDate(today)}.`} />
      <section aria-labelledby="today-heading">
        <SectionTitle id="today-heading" title="Hôm nay" count={todayCount} />
        {todayContent}
      </section>
      {upcomingContent && (
        <section aria-labelledby="upcoming-heading" className="mt-6">
          <SectionTitle id="upcoming-heading" title="Sắp tới" />
          {upcomingContent}
        </section>
      )}
    </>
  );
}
