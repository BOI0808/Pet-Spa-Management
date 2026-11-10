"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md (hồ sơ thú cưng chỉ xem: FR-PET-02).
// Thẻ này làm vùng 1 – 3 (tiêu đề, danh sách chờ, đầu thẻ chi tiết + hồ sơ thú cưng); các vùng 4 – 6 thuộc thẻ 144 và 145.
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { usePendingAppointments } from "@/lib/queries/appointments";
import { PendingDetailCard } from "../components/pending-detail-card";
import { PendingSkeleton } from "../components/pending-skeleton";
import { PendingTicketItem } from "../components/pending-ticket-item";
import { buildPendingHref, parseTypeFilter, type TypeFilter } from "../params";

// Thứ tự nhóm nút theo UI-Screens MW-04 vùng 1.
const FILTER_OPTIONS: readonly { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "Spa", label: APPOINTMENT_TYPE_LABELS.Spa },
  { value: "Hotel", label: APPOINTMENT_TYPE_LABELS.Hotel },
];

/** Giờ hẹn: giờ bắt đầu (spa) hoặc giờ nhận (lưu trú); thiếu thì dùng lúc tạo lịch. */
function getAppointmentTime(appointment: Appointment) {
  const iso = appointment.type === "Spa" ? appointment.slotStart : appointment.plannedCheckIn;
  return Date.parse(iso ?? appointment.createdAt);
}

/** Giờ hẹn gần nhất lên đầu (UI-Screens G-06); bằng nhau thì lịch tạo trước lên trước. Backend chỉ sắp theo lúc tạo lịch. */
function sortByAppointmentTime(items: readonly Appointment[]) {
  return [...items].sort(
    (a, b) => getAppointmentTime(a) - getAppointmentTime(b) || Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function PendingScreen() {
  const pendingQuery = usePendingAppointments();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseTypeFilter(searchParams.get("type"));
  const selectedId = searchParams.get("appointmentId");

  const items = pendingQuery.data ? sortByAppointmentTime(pendingQuery.data.items) : undefined;
  const visible = items?.filter((item) => filter === "all" || item.type === filter);
  // Không có `?appointmentId=` hoặc lịch đó không còn trong danh sách đang hiện thì chọn phiếu đầu tiên.
  const selected = visible?.find((item) => item.appointmentId === selectedId) ?? visible?.[0];

  const spaCount = items?.filter((item) => item.type === "Spa").length ?? 0;
  const hotelCount = items?.filter((item) => item.type === "Hotel").length ?? 0;

  function changeFilter(next: TypeFilter) {
    // Giữ lịch đang chọn nếu nó vẫn thuộc nhóm mới.
    const keepSelected = selected && (next === "all" || selected.type === next);
    router.replace(buildPendingHref({ filter: next, appointmentId: keepSelected ? selected.appointmentId : undefined }), {
      scroll: false,
    });
  }

  // Vùng 1 – Tiêu đề + lọc; vùng 2 – Danh sách chờ; vùng 3 – Đầu thẻ chi tiết.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Lịch hẹn chờ xác nhận</h1>
          <p className="mt-1 text-muted">
            {items && `Spa ${spaCount}, lưu trú ${hotelCount}. Xử lý theo thứ tự giờ hẹn gần nhất.`}
          </p>
        </div>
        <SegmentedControl label="Lọc theo loại lịch" options={FILTER_OPTIONS} value={filter} onChange={changeFilter} />
      </div>

      {items === undefined ? (
        pendingQuery.isError ? (
          isForbiddenError(pendingQuery.error) ? (
            <ForbiddenState />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <ErrorAlert error={pendingQuery.error} className="w-full" />
              <Button onClick={() => void pendingQuery.refetch()}>Thử lại</Button>
            </div>
          )
        ) : (
          <PendingSkeleton />
        )
      ) : visible?.length === 0 || selected === undefined ? (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Không còn lịch chờ xác nhận"
              description="Lịch mới đặt hoặc cần xếp lại sẽ xuất hiện ở đây."
            />
          ) : (
            <EmptyState
              icon="clipboard"
              title={`Không có lịch ${filter === "all" ? "" : APPOINTMENT_TYPE_LABELS[filter].toLocaleLowerCase("vi-VN")} chờ xác nhận`}
              description="Chọn “Tất cả” để xem các lịch còn lại."
            />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-[420px_minmax(0,1fr)] items-start gap-6 max-[1180px]:grid-cols-1">
          <div className="flex flex-col gap-2.5">
            {(visible ?? []).map((item) => (
              <PendingTicketItem
                key={item.appointmentId}
                appointment={item}
                selected={item.appointmentId === selected.appointmentId}
                href={buildPendingHref({ filter, appointmentId: item.appointmentId })}
              />
            ))}
          </div>
          <PendingDetailCard key={selected.appointmentId} appointment={selected} />
        </div>
      )}

      {pendingQuery.data && pendingQuery.data.total > pendingQuery.data.items.length && (
        <Alert tone="info" className="mt-3">
          Đang hiển thị {pendingQuery.data.items.length} trong {pendingQuery.data.total} lịch chờ xác nhận; số đếm ở trên chỉ tính
          trong phần đang hiển thị. Xử lý bớt để xem tiếp.
        </Alert>
      )}
    </>
  );
}
