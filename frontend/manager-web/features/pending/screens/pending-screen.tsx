"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md (hồ sơ thú cưng chỉ xem: FR-PET-02).
// Thẻ 143 làm vùng 1 – 3 (tiêu đề, danh sách chờ, đầu thẻ chi tiết + hồ sơ thú cưng); thẻ 145 thêm vùng 4, 6, 8 của lịch lưu trú;
// vùng 4 – 6 của lịch spa thuộc thẻ 144.
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { usePendingAppointments, useRemovePendingAppointment } from "@/lib/queries/appointments";
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

function MissingAppointmentNotice({
  matchedInAll,
  filter,
  loadedCount,
  isTruncated,
  onNavigate,
}: {
  matchedInAll: Appointment | undefined;
  filter: TypeFilter;
  loadedCount: number;
  isTruncated: boolean;
  onNavigate: (href: string) => void;
}) {
  if (matchedInAll) {
    const typeLabel = APPOINTMENT_TYPE_LABELS[matchedInAll.type].toLocaleLowerCase("vi-VN");
    return (
      <Card className="p-5">
        <NotFoundState
          title="Lịch hẹn đang chọn không thuộc bộ lọc hiện tại"
          description={`Lịch này thuộc nhóm ${typeLabel}, không nằm trong bộ lọc đang chọn.`}
          action={
            <Button onClick={() => onNavigate(buildPendingHref({ filter: "all", appointmentId: matchedInAll.appointmentId }))}>
              Xem tất cả để mở lịch này
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <NotFoundState
        title="Không tìm thấy lịch chờ xác nhận này"
        description={
          isTruncated
            ? `Lịch hẹn có thể nằm ngoài ${loadedCount} lịch tải trước hoặc không còn ở trạng thái Chờ xác nhận.`
            : "Lịch hẹn có thể đã được xác nhận, từ chối, hủy hoặc liên kết không đúng."
        }
        action={<Button onClick={() => onNavigate(buildPendingHref({ filter }))}>Về danh sách chờ</Button>}
      />
    </Card>
  );
}

export function PendingScreen() {
  const pendingQuery = usePendingAppointments();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseTypeFilter(searchParams.get("type"));
  const rawSelectedId = searchParams.get("appointmentId");
  const selectedId = rawSelectedId && rawSelectedId.trim().length > 0 ? rawSelectedId.trim() : null;

  const items = pendingQuery.data ? sortByAppointmentTime(pendingQuery.data.items) : undefined;
  const visible = items?.filter((item) => filter === "all" || item.type === filter);
  const matchedInAll = selectedId ? items?.find((item) => item.appointmentId === selectedId) : undefined;
  // Chỉ tự chọn phiếu đầu tiên khi URL không chỉ định `?appointmentId=`; nếu URL có mã mà không thấy thì báo rõ thay vì âm thầm mở nhầm lịch khác.
  const selected = selectedId ? visible?.find((item) => item.appointmentId === selectedId) : visible?.[0];

  const spaCount = items?.filter((item) => item.type === "Spa").length ?? 0;
  const hotelCount = items?.filter((item) => item.type === "Hotel").length ?? 0;
  const replaceUrl = (href: string) => router.replace(href, { scroll: false });
  const removePendingAppointment = useRemovePendingAppointment();

  /**
   * Sau khi xác nhận hoặc từ chối: chọn lịch liền sau trong danh sách đang lọc (hết thì lịch liền trước; không còn lịch nào thì bỏ `?appointmentId=`),
   * rồi gỡ lịch đã xử lý khỏi danh sách và tải lại (UI-Screens MW-04 “Hành vi”).
   * Đổi URL bằng History API (Next.js đồng bộ với `useSearchParams` tại chỗ, không chờ máy chủ) và làm TRƯỚC khi gỡ lịch,
   * để không hiện nhầm “Không tìm thấy lịch chờ xác nhận này” trong lúc `router.replace` còn đang chờ.
   */
  function handleProcessed(processedId: string) {
    const index = visible?.findIndex((item) => item.appointmentId === processedId) ?? -1;
    const next = index === -1 ? undefined : (visible?.[index + 1] ?? visible?.[index - 1]);
    window.history.replaceState(null, "", buildPendingHref({ filter, appointmentId: next?.appointmentId }));
    removePendingAppointment(processedId);
  }

  function changeFilter(next: TypeFilter) {
    // Giữ lịch đang chỉ định/đang chọn nếu nó vẫn thuộc nhóm mới.
    const current = matchedInAll ?? selected;
    const keepSelected = current && (next === "all" || current.type === next);
    replaceUrl(buildPendingHref({ filter: next, appointmentId: keepSelected ? current.appointmentId : undefined }));
  }

  const missingNotice =
    items !== undefined && selected === undefined && selectedId !== null ? (
      <MissingAppointmentNotice
        matchedInAll={matchedInAll}
        filter={filter}
        loadedCount={items.length}
        isTruncated={Boolean(pendingQuery.data?.isTruncated)}
        onNavigate={replaceUrl}
      />
    ) : null;

  function renderMainContent() {
    if (items === undefined) {
      if (pendingQuery.isError) {
        return isForbiddenError(pendingQuery.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={pendingQuery.error} className="w-full" />
            <Button onClick={() => void pendingQuery.refetch()}>Thử lại</Button>
          </div>
        );
      }
      return <PendingSkeleton />;
    }

    if (!visible || visible.length === 0) {
      if (missingNotice) {
        return missingNotice;
      }
      return (
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
      );
    }

    return (
      <div className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => (
            <PendingTicketItem
              key={item.appointmentId}
              appointment={item}
              selected={item.appointmentId === selected?.appointmentId}
              href={buildPendingHref({ filter, appointmentId: item.appointmentId })}
            />
          ))}
        </div>
        {selected ? <PendingDetailCard key={selected.appointmentId} appointment={selected} onProcessed={handleProcessed} /> : missingNotice}
      </div>
    );
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

      {renderMainContent()}

      {pendingQuery.data?.isTruncated && (
        <Alert tone="info" className="mt-3">
          Đang hiển thị {pendingQuery.data.items.length} trong {pendingQuery.data.total} lịch chờ xác nhận đầu tiên; số đếm ở trên chỉ tính
          trong phần đang hiển thị. Xử lý bớt để xem tiếp.
        </Alert>
      )}
    </>
  );
}
