"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS, CANCEL_REASON_LABELS } from "@/lib/labels";
import { useAppointmentDetail } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { ROUTES } from "@/lib/routes";
import { buildPendingHref } from "@/features/pending/params";
import { formatListSchedule } from "../schedule";

// Lề ngang 10px để 6 cột vừa bề rộng nội dung ở 1024px mà không cuộn ngang.
export const cellClass = "border-b border-line-soft px-2.5 py-3 align-middle";

// Nút “Xử lý” (`.btn-secondary.btn-sm`) và liên kết “Xem” của ui-demo; dùng thẻ `a` vì chỉ chuyển trang.
const processLinkClass =
  "inline-flex min-h-[34px] items-center justify-center whitespace-nowrap rounded-[10px] border border-lagoon bg-white px-3 text-[13px] font-semibold leading-none text-lagoon-700 hover:bg-lagoon-25";
const viewLinkClass = "inline-flex min-h-[34px] items-center px-3 text-[13px] font-semibold text-ink underline-offset-2 hover:underline";

/**
 * Mã chuồng của lịch lưu trú: `GET /appointments` chỉ trả `cageId` nên tra mã trong `GET /cages` (UI-Screens G-05); mọi dòng dùng chung một
 * lần gọi. Chưa tải được danh sách chuồng thì chỉ cho biết đã gán chuồng.
 */
function HotelCageCell({ cageId }: { cageId: string | null | undefined }) {
  const cages = useCages();
  if (!cageId) return <span className="text-muted">Chưa gán</span>;
  const code = cages.data?.items.find((item) => item.cageId === cageId)?.code;
  if (code) return <>Chuồng {code}</>;
  if (cages.isPending) return <Skeleton className="h-3.5 w-16" />;
  return <>Đã gán chuồng</>;
}

/**
 * Nhân viên (spa) hoặc chuồng (lưu trú). `GET /appointments` chưa trả tên nhân viên (UI-Screens G-05) nên lịch spa đã xác nhận
 * trở đi gọi `GET /appointments/{id}` cho từng dòng của trang đang xem; lịch chờ xác nhận chưa có nhân viên nên không gọi.
 */
function AssigneeCell({ appointment, detailQuery }: { appointment: Appointment; detailQuery: ReturnType<typeof useAppointmentDetail> }) {
  if (appointment.status === "Cancelled") return <span className="text-muted">–</span>;

  if (appointment.type === "Hotel") {
    return <HotelCageCell cageId={appointment.cageId} />;
  }

  if (appointment.status === "Pending") return <span className="text-muted">Chưa phân công</span>;
  if (detailQuery.isPending) return <Skeleton className="h-3.5 w-20" />;
  if (!detailQuery.data) return <span className="text-muted">–</span>;

  // Lịch Hoàn tất không còn giữ chỗ (`isHolding = false`) nhưng vẫn cần hiện người đã làm.
  const staff = (detailQuery.data.staff ?? []).filter((item) => item.isHolding || appointment.status === "Completed");
  if (staff.length === 0) return <span className="text-muted">Chưa phân công</span>;
  return <>{staff.map((item) => item.fullName).join(", ")}</>;
}

/** Dòng phụ dưới trạng thái: lý do hủy, hoặc “Chờ khách xác nhận chi phí” khi lịch spa đang có yêu cầu xác nhận chi phí mới. */
function getStatusNote(appointment: Appointment, hasPendingCostConfirmation: boolean) {
  if (appointment.status === "Cancelled" && appointment.cancelReason) {
    return { text: CANCEL_REASON_LABELS[appointment.cancelReason], className: "text-muted" };
  }
  if (hasPendingCostConfirmation) return { text: "Chờ khách xác nhận chi phí", className: "text-st-pending" };
  return null;
}

type AppointmentListRowProps = { appointment: Appointment };

/**
 * Một dòng của bảng MW-03 (vùng 2). Cột “Thanh toán” của wireframe chưa làm: không thuộc FR-EXE-08 và đã có MW-10 (thẻ 152).
 * Danh sách chưa trả loài thú cưng (G-05); không gọi `GET /pets/{petId}` từng dòng như MW-04 nên dùng hình trung tính thay ảnh loài.
 */
export function AppointmentListRow({ appointment }: AppointmentListRowProps) {
  const { appointmentId, type, status } = appointment;
  const needsDetail = type === "Spa" && status !== "Pending" && status !== "Cancelled";
  const detailQuery = useAppointmentDetail(appointmentId, { enabled: needsDetail });
  const schedule = formatListSchedule(appointment);
  const note = getStatusNote(appointment, Boolean(detailQuery.data?.pendingCostConfirmation));
  const code = formatAppointmentCode(appointmentId);

  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className="[&:hover>td]:bg-[#F8FBFB]">
      <td className={`${cellClass} whitespace-nowrap`}>
        <Link href={ROUTES.appointmentDetail(appointmentId)} className="font-semibold text-lagoon-700 underline">
          {code}
        </Link>
        <span className={`mt-0.5 flex items-center gap-1 text-xs ${type === "Hotel" ? "text-hotel" : "text-lagoon"}`}>
          <Icon name={type === "Hotel" ? "bed" : "droplet"} className="size-3.5" />
          {APPOINTMENT_TYPE_LABELS[type]}
        </span>
      </td>
      <td className={cellClass}>
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-line-soft text-muted">
            <Icon name="paw" className="size-[18px]" />
          </span>
          <div className="min-w-0 leading-[18px]">
            <div className="break-words font-semibold">{appointment.petName ?? "Thú cưng"}</div>
            <div className="break-words text-xs text-muted">{appointment.customerName ?? "Khách hàng"}</div>
          </div>
        </div>
      </td>
      <td className={`${cellClass} tabular-nums`}>
        {schedule.primary ? (
          <div className="leading-[18px]">
            <div>{schedule.primary}</div>
            <div className="text-xs text-muted">{schedule.secondary}</div>
          </div>
        ) : (
          <span className="text-muted">–</span>
        )}
      </td>
      <td className={cellClass}>
        <AssigneeCell appointment={appointment} detailQuery={detailQuery} />
      </td>
      <td className={cellClass}>
        <StatusBadge status={status} />
        {note && <div className={`mt-1 text-xs leading-4 ${note.className}`}>{note.text}</div>}
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        {status === "Pending" ? (
          // “Xử lý” mở MW-04 đúng lịch này; bộ lọc loại về “Tất cả” để chắc chắn thấy lịch (User-Flows 2.3).
          <Link href={buildPendingHref({ filter: "all", appointmentId })} className={processLinkClass}>
            Xử lý
            <span className="sr-only"> lịch {code}</span>
          </Link>
        ) : (
          <Link href={ROUTES.appointmentDetail(appointmentId)} className={viewLinkClass}>
            Xem
            <span className="sr-only"> lịch {code}</span>
          </Link>
        )}
      </td>
    </tr>
  );
}
