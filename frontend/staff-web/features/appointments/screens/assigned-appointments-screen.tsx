"use client";

// SW-02 Lịch hẹn – phần nhân viên spa (UI-Screens SW-02 vùng 4 → 6, FR-EXE-01, UF-05).
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFullDate } from "@/lib/format";
import { useAppointmentsByStatuses } from "@/lib/queries/appointments";
import { getStoreToday } from "@/lib/time";
import { ASSIGNED_STATUSES, splitAssigned } from "../appointments";
import { AssignedTicket } from "../components/assigned-ticket";

// Mỗi trạng thái một trang 100 lịch (tối đa của API). Một nhân viên hiếm khi có hơn 100 lịch chưa xong; nếu có thì báo.
const LIST_PARAMS = { type: "Spa", pageSize: 100 } as const;

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2>{title}</h2>
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

export function AssignedAppointmentsScreen() {
  // Backend chỉ trả lịch đang phân công cho chính nhân viên này (BR-16); không lọc được theo ngày nên lọc ở web.
  const list = useAppointmentsByStatuses(ASSIGNED_STATUSES, LIST_PARAMS);
  // Tính lại mỗi lần vẽ (danh sách tải lại 60 giây/lần): mở màn qua nửa đêm thì “Hôm nay” vẫn đúng ngày.
  const today = getStoreToday();

  let content;
  if (list.isPending) {
    content = <ListSkeleton />;
  } else if (list.error) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={list.error} className="w-full" />
        <Button onClick={list.refetch}>Thử lại</Button>
      </div>
    );
  } else {
    const { today: todayItems, upcoming } = splitAssigned(list.items, today);
    content = (
      <>
        {list.truncated && (
          <Alert tone="warn" className="mb-4">
            Bạn có hơn 100 lịch ở cùng một trạng thái; danh sách chỉ hiện 100 lịch đầu.
          </Alert>
        )}
        <section aria-labelledby="today-heading">
          <div id="today-heading">
            <SectionTitle title="Hôm nay" count={todayItems.length} />
          </div>
          {todayItems.length === 0 ? (
            <Card>
              <EmptyState
                title="Hôm nay bạn chưa được phân công lịch nào."
                description="Lịch mới hiện ở đây khi quản lý xác nhận và xếp bạn vào lịch."
                icon="calendar"
              />
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {todayItems.map((appointment) => (
                <AssignedTicket key={appointment.appointmentId} appointment={appointment} today={today} />
              ))}
            </ul>
          )}
        </section>
        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming-heading" className="mt-6">
            <div id="upcoming-heading">
              <SectionTitle title="Sắp tới" />
            </div>
            <ul className="flex flex-col gap-3">
              {upcoming.map((appointment) => (
                <AssignedTicket key={appointment.appointmentId} appointment={appointment} today={today} compact />
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      {/* Ca làm hôm nay không hiện: nhân viên spa chưa đọc được ca của mình (G-18). */}
      <PageHeader title="Lịch được phân công cho bạn" description={`${formatFullDate(today)}.`} />
      {content}
    </>
  );
}
