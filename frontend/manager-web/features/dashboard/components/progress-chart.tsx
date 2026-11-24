import Link from "next/link";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import type { AppointmentStatus } from "@/lib/api/types";
import { getInitials } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import {
  CHART_END_HOUR,
  CHART_START_HOUR,
  CLEANING_BUFFER_MINUTES,
  UNASSIGNED_ROW_ID,
  type ChartBlock,
  type ChartRow,
} from "../dashboard";

const LABEL_COLUMN = "grid-cols-[104px_minmax(0,1fr)] max-[640px]:grid-cols-[84px_minmax(0,1fr)]";
const LANE_HEIGHT_PX = 46;
const BLOCK_HEIGHT_PX = 40;
const HOURS = Array.from({ length: CHART_END_HOUR - CHART_START_HOUR }, (_, index) => CHART_START_HOUR + index);
const HOUR_COUNT = CHART_END_HOUR - CHART_START_HOUR;

// Màu khối theo trạng thái (`.gantt-block` của ui-demo): cùng bộ token `st-*` với huy hiệu; chờ xác nhận viền nét đứt.
const BLOCK_CLASS: Record<AppointmentStatus, string> = {
  Pending: "border-dashed border-current/50 bg-st-pending-bg text-st-pending",
  Confirmed: "border-current/40 bg-st-confirmed-bg text-st-confirmed",
  Received: "border-current/40 bg-st-received-bg text-st-received",
  InProgress: "border-current/40 bg-st-active-bg text-st-active",
  InStay: "border-current/40 bg-st-active-bg text-st-active",
  Completed: "border-current/40 bg-st-completed-bg text-st-completed",
  Cancelled: "border-current/40 bg-st-cancelled-bg text-st-cancelled",
};

// `.gantt-shift` và `.gantt-buffer` của ui-demo: nền kẻ chéo cho ca làm, vạch dọc cho thời gian dọn dẹp.
const SHIFT_BACKGROUND = "bg-[repeating-linear-gradient(135deg,var(--color-lagoon-50)_0_6px,var(--color-lagoon-25)_6px_12px)]";
const BUFFER_BACKGROUND = "bg-[repeating-linear-gradient(90deg,var(--color-line)_0_1px,transparent_1px_3px)]";
// Kẻ dọc mỗi giờ trên vùng vẽ: 13 khoảng từ 08:00 đến 21:00. Viết nguyên văn (không ghép chuỗi) để Tailwind nhận ra lớp.
const GRID_BACKGROUND = "bg-[linear-gradient(90deg,var(--color-line-soft)_1px,transparent_1px)] bg-size-[calc(100%/13)_100%]";

function Block({ block }: { block: ChartBlock }) {
  const statusLabel = APPOINTMENT_STATUS_LABELS[block.status];
  return (
    <>
      <Link
        href={ROUTES.appointmentDetail(block.appointmentId)}
        aria-label={`Lịch spa của ${block.petName}, ${block.timeLabel}, ${statusLabel}`}
        title={`${block.petName} · ${block.timeLabel} · ${statusLabel}`}
        style={{ left: `${block.leftPct}%`, width: `${block.widthPct}%`, top: 4 + block.lane * LANE_HEIGHT_PX, height: BLOCK_HEIGHT_PX }}
        className={`absolute z-[1] flex min-w-0 flex-col justify-center overflow-hidden rounded-lg border px-1.5 text-xs leading-4 ${BLOCK_CLASS[block.status]}`}
      >
        <span className="truncate font-semibold">{block.petName}</span>
        <span className="truncate">{statusLabel}</span>
      </Link>
      {block.bufferWidthPct > 0 && (
        <span
          aria-hidden="true"
          style={{ left: `${block.leftPct + block.widthPct}%`, width: `${block.bufferWidthPct}%`, top: 4 + block.lane * LANE_HEIGHT_PX, height: BLOCK_HEIGHT_PX }}
          className={`absolute ${BUFFER_BACKGROUND}`}
        />
      )}
    </>
  );
}

type ProgressChartProps = {
  rows: ChartRow[];
  /** Vị trí đường “Hiện tại” theo phần trăm; `null` khi ngoài trục giờ. */
  nowPercent: number | null;
  /** “09:20”. */
  nowLabel: string;
};

/**
 * MW-02 vùng 3 – Tiến độ spa theo nhân viên (FR-EXE-08): mỗi nhân viên một hàng, trục 08:00 – 21:00, nền kẻ chéo là ca làm,
 * khối là lịch spa (màu theo trạng thái, bấm để mở MW-05), vạch nét đứt sau khối là thời gian dọn dẹp, đường dọc là giờ hiện tại.
 * Khi khung hẹp hơn 600px (điện thoại) biểu đồ cuộn ngang trong khung của nó, trang không cuộn ngang.
 */
export function ProgressChart({ rows, nowPercent, nowLabel }: ProgressChartProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <div className="relative min-w-[600px]">
          {/* Trục giờ */}
          <div className={`grid ${LABEL_COLUMN}`}>
            <div />
            <div className="relative h-8">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  style={{ left: `${((hour - CHART_START_HOUR) / HOUR_COUNT) * 100}%` }}
                  className="absolute top-1 pl-1 text-xs leading-4 text-muted tabular-nums"
                >
                  {String(hour).padStart(2, "0")}
                </span>
              ))}
              {nowPercent !== null && (
                <span
                  style={{ left: `${nowPercent}%` }}
                  className="absolute top-0 z-[3] -translate-x-1/2 rounded-md bg-ink px-1.5 text-xs font-semibold leading-5 text-white tabular-nums"
                >
                  {nowLabel}
                </span>
              )}
            </div>
          </div>

          {/* Các hàng nhân viên */}
          {rows.map((row) => (
            <div key={row.id} className={`grid border-t border-line-soft ${LABEL_COLUMN}`}>
              <div className="flex min-w-0 items-center gap-2 pr-2">
                {row.id !== UNASSIGNED_ROW_ID && (
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-lagoon-50 text-xs font-semibold text-lagoon-700"
                  >
                    {getInitials(row.label)}
                  </span>
                )}
                <span className={`min-w-0 break-words ${row.id === UNASSIGNED_ROW_ID ? "text-muted" : "font-semibold"}`}>{row.label}</span>
              </div>
              <div
                style={{ height: row.laneCount * LANE_HEIGHT_PX + 8 }}
                className={`relative border-l border-line-soft ${GRID_BACKGROUND}`}
              >
                {row.shifts.map((shift, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    style={{ left: `${shift.leftPct}%`, width: `${shift.widthPct}%` }}
                    className={`absolute inset-y-1 rounded-lg ${SHIFT_BACKGROUND}`}
                  />
                ))}
                {row.blocks.map((block) => (
                  <Block key={`${block.appointmentId}-${block.lane}`} block={block} />
                ))}
              </div>
            </div>
          ))}

          {/* Đường “Hiện tại” xuyên qua mọi hàng */}
          {nowPercent !== null && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-[104px] max-[640px]:left-[84px]">
              <span style={{ left: `${nowPercent}%` }} className="absolute inset-y-0 z-[2] w-px bg-ink" />
            </div>
          )}
        </div>
      </div>

      {/* Chú giải */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-4 rounded ${SHIFT_BACKGROUND}`} />
          Ca làm
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-4 w-4 ${BUFFER_BACKGROUND}`} />
          Dọn dẹp {CLEANING_BUFFER_MINUTES} phút
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-4 w-px bg-ink" />
          Hiện tại, {nowLabel}
        </span>
        {(["Confirmed", "Received", "InProgress", "Pending", "Completed"] as const).map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
    </>
  );
}

/** Dùng ở nơi chưa có nhân viên nào để vẽ. */
export function ProgressChartEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
      <Icon name="users" className="size-8 text-lagoon" />
      <h3>Chưa có nhân viên spa nào</h3>
      <p className="max-w-[340px] text-muted">Thêm nhân viên spa ở mục Nhân viên để theo dõi tiến độ theo từng người.</p>
    </div>
  );
}
