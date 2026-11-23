"use client";

// MW-02 Tổng quan và giám sát tiến độ – UI-Screens.md (UC-11; FR-EXE-08, UF-04). Số liệu làm mới 60 giây/lần khi tab đang hiển thị.
// Chưa làm: thẻ “Chuồng đang chứa” và vùng 5 “Chuồng đang chứa” (cần GET /cages, thẻ 150).
import Link from "next/link";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Alert } from "@/components/feedback/alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { useAppointmentCount, useAppointmentDetails, useTodayAppointments } from "@/lib/queries/appointments";
import { useUnpaidPayments, useUnpaidSummary } from "@/lib/queries/payments";
import { useStaff } from "@/lib/queries/staff";
import { useWorkShiftsOfDay } from "@/lib/queries/work-shifts";
import { ROUTES } from "@/lib/routes";
import { toStoreDate, toStoreTime } from "@/lib/time";
import type { Appointment, AppointmentDetail } from "@/lib/api/types";
import { AttentionCard } from "../components/attention-card";
import { KpiTile } from "../components/kpi-tile";
import { ProgressChart, ProgressChartEmpty } from "../components/progress-chart";
import { buildAttentionItems, buildChartData, formatDashboardDate, getNowPercent, summarizeSpaToday } from "../dashboard";
import { useMinuteClock } from "../use-minute-clock";

const linkButtonClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-lagoon bg-white px-4 font-semibold text-lagoon-700 hover:bg-lagoon-25";

/** Lịch spa đã xác nhận trở đi mới có nhân viên phụ trách (và yêu cầu xác nhận chi phí); lịch chờ xác nhận, đã hủy thì không cần chi tiết. */
function needsDetail(appointment: Appointment) {
  return appointment.type === "Spa" && appointment.status !== "Pending" && appointment.status !== "Cancelled";
}

const kpiValueFallback = "–";

function DashboardContent({ now }: { now: number }) {
  const today = toStoreDate(new Date(now).toISOString());
  const nowLabel = toStoreTime(new Date(now).toISOString());

  const pendingSpa = useAppointmentCount({ status: "Pending", type: "Spa" });
  const pendingHotel = useAppointmentCount({ status: "Pending", type: "Hotel" });
  const spaToday = useTodayAppointments("Spa", today);
  const hotelToday = useTodayAppointments("Hotel", today);
  const staff = useStaff();
  const shifts = useWorkShiftsOfDay(today);
  const unpaidSummary = useUnpaidSummary();
  const unpaidPayments = useUnpaidPayments();

  const spaItems = spaToday.data?.items;
  const detailIds = (spaItems ?? []).filter(needsDetail).map((item) => item.appointmentId);
  const detailResults = useAppointmentDetails(detailIds);
  const details = new Map<string, AppointmentDetail>();
  detailResults.forEach((result, index) => {
    if (result.data) details.set(detailIds[index], result.data);
  });
  const detailsLoading = detailResults.some((result) => result.isPending);

  // Vùng 2 – Thẻ số liệu.
  const pendingTotal = pendingSpa.data !== undefined && pendingHotel.data !== undefined ? pendingSpa.data + pendingHotel.data : undefined;
  const spaSummary = spaItems ? summarizeSpaToday(spaItems) : undefined;
  const todayQuery = `?type=Spa&date=${today}`;

  // Vùng 3 – Biểu đồ.
  const chart =
    spaItems && staff.data
      ? buildChartData({ date: today, staff: staff.data.items, shifts: shifts.data?.items ?? [], appointments: spaItems, details })
      : undefined;
  const chartError = spaToday.isError && !spaItems ? spaToday : staff.isError && !staff.data ? staff : null;
  const hasBlocks = chart?.rows.some((row) => row.blocks.length > 0) ?? false;

  // Vùng 4 – Cần chú ý.
  const attentionItems =
    spaItems && hotelToday.data
      ? buildAttentionItems({
          date: today,
          spaAppointments: spaItems,
          hotelAppointments: hotelToday.data.items,
          details,
          unpaidStayAppointmentIds: new Set(
            (unpaidPayments.data ?? []).filter((payment) => payment.kind === "Stay").map((payment) => payment.appointmentId),
          ),
        })
      : undefined;

  const updatedAt = spaToday.dataUpdatedAt > 0 ? toStoreTime(new Date(spaToday.dataUpdatedAt).toISOString()) : null;

  return (
    <>
      {/* Vùng 1 – Đầu trang */}
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1>Tổng quan hôm nay</h1>
          <p className="mt-1 text-muted">
            {formatDashboardDate(today)}.{updatedAt ? ` Cập nhật lúc ${updatedAt}.` : ""}
          </p>
        </div>
        <Link href={ROUTES.appointments} className={linkButtonClass}>
          <Icon name="list" />
          Tất cả lịch hẹn
        </Link>
      </div>

      {/* Vùng 2 – Thẻ số liệu */}
      <div className="mb-4 grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <KpiTile
          icon="clipboard"
          label="Chờ xác nhận"
          value={pendingTotal ?? kpiValueFallback}
          accent={pendingTotal !== undefined && pendingTotal > 0}
          href={ROUTES.pending}
          note={
            pendingTotal === undefined
              ? "Chưa tải được số liệu."
              : `Spa ${pendingSpa.data}, lưu trú ${pendingHotel.data}.${pendingTotal > 0 ? " Cần bạn xử lý." : ""}`
          }
        />
        <KpiTile
          icon="droplet"
          label="Lịch spa hôm nay"
          value={spaSummary?.total ?? kpiValueFallback}
          href={`${ROUTES.appointments}${todayQuery}`}
          note={
            spaSummary === undefined
              ? "Chưa tải được số liệu."
              : spaSummary.total === 0
                ? "Chưa có lịch spa nào."
                : `${spaSummary.description}.${spaToday.data && spaToday.data.total > spaToday.data.items.length ? " Chỉ tính 100 lịch đầu." : ""}`
          }
        />
        <KpiTile
          icon="wallet"
          label="Khoản chưa thanh toán"
          value={unpaidSummary.data?.count ?? kpiValueFallback}
          href={ROUTES.payments}
          note={
            unpaidSummary.data === undefined
              ? "Chưa tải được số liệu."
              : unpaidSummary.data.count === 0
                ? "Không có khoản nào."
                : `${formatMoney(unpaidSummary.data.amount)}${unpaidSummary.data.isPartial ? " (tính trên 100 khoản đầu)" : ""}`
          }
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-4 max-[1320px]:grid-cols-1">
        {/* Vùng 3 – Tiến độ spa theo nhân viên */}
        <Card>
          <CardHeader title="Tiến độ spa theo nhân viên">
            <span className="text-[13px] text-muted">08:00 – 21:00</span>
          </CardHeader>
          <CardBody>
            {chartError ? (
              <div className="flex flex-col items-start gap-3">
                <ErrorAlert error={chartError.error} className="w-full" />
                <Button size="sm" onClick={() => void chartError.refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : chart === undefined ? (
              <Skeleton className="h-[220px] w-full" aria-busy="true" aria-label="Đang tải biểu đồ" />
            ) : chart.rows.length === 0 ? (
              <ProgressChartEmpty />
            ) : (
              <div className="flex flex-col gap-3">
                <ProgressChart rows={chart.rows} nowPercent={getNowPercent(now, today)} nowLabel={nowLabel} />
                {!hasBlocks && !detailsLoading && <p className="text-muted">Hôm nay chưa có lịch spa nào.</p>}
                {detailsLoading && <p className="text-xs text-muted">Đang tải nhân viên phụ trách…</p>}
                {!detailsLoading && chart.missingStaffCount > 0 && (
                  <Alert tone="info">Chưa tải được nhân viên của {chart.missingStaffCount} lịch nên chưa hiện trên biểu đồ.</Alert>
                )}
                {shifts.isError && <Alert tone="info">Chưa tải được ca làm nên chưa hiện nền ca làm.</Alert>}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Vùng 4 – Cần chú ý */}
        <AttentionCard items={attentionItems} isError={hotelToday.isError && !hotelToday.data} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải tổng quan">
      <Skeleton className="mb-6 h-10 w-64" />
      <div className="mb-4 grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <Skeleton className="h-[110px] rounded-2xl" />
        <Skeleton className="h-[110px] rounded-2xl" />
        <Skeleton className="h-[110px] rounded-2xl" />
      </div>
      <Skeleton className="h-[260px] rounded-2xl" />
    </div>
  );
}

export function DashboardScreen() {
  // Giờ chỉ có ở trình duyệt; trước đó hiện khung xương để nội dung phụ thuộc giờ không lệch khi hydrate.
  const now = useMinuteClock();
  if (now === null) return <DashboardSkeleton />;
  return <DashboardContent now={now} />;
}
