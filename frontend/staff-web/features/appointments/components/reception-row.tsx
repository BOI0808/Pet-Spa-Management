"use client";

import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/lib/api/types";
import { useAppointment, useAppointmentPayments } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { appointmentDetailRoute, checkInRoute, paymentsRoute } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import { canCheckIn, nightsOf, rowMoment, speciesAndBreed, staffNames } from "../appointments";

type ReceptionRowProps = {
  appointment: Appointment;
  /** Ngày đang xem (`?date=`), để biết dòng lưu trú là “nhận” hay “trả”. */
  date: string;
  today: string;
  /** `cageId` → mã chuồng, tra từ GET /cages (G-05). Rỗng khi API chuồng chưa có (thẻ 88) hoặc tải lỗi. */
  cageCodes: Map<string, string>;
};

const CELL = "border-b border-line-soft px-4 py-3 align-middle";
const MUTED = "text-[13px] text-muted";

/**
 * Một dòng bảng SW-02 của lễ tân (UI-Screens SW-02 vùng 3). Danh sách không có giống loài và tên nhân viên (G-05) nên
 * dòng tải thêm hồ sơ bé và, với lịch spa đã có nhân viên, chi tiết lịch; số lịch trong ngày ít nên chấp nhận được.
 */
export function ReceptionRow({ appointment, date, today, cageCodes }: ReceptionRowProps) {
  const isSpa = appointment.type === "Spa";
  const pet = usePet(appointment.petId);
  // Lịch Chờ xác nhận chưa có nhân viên; lịch đã hủy không cần tên nhân viên nên không tải chi tiết.
  const needsStaff = isSpa && appointment.status !== "Pending" && appointment.status !== "Cancelled";
  const detail = useAppointment(appointment.appointmentId, { enabled: needsStaff });
  // Lịch spa Hoàn tất: đọc khoản thanh toán để biết còn phải thu không (nút “Thu tiền” → SW-09, thẻ 128).
  const isCompletedSpa = isSpa && appointment.status === "Completed";
  const payments = useAppointmentPayments(appointment.appointmentId, { enabled: isCompletedSpa });
  const hasUnpaidSpa =
    isCompletedSpa && (payments.data ?? []).some((payment) => payment.kind === "Spa" && payment.status === "Unpaid");

  const moment = rowMoment(appointment, date);
  const petName = appointment.petName ?? pet.data?.name ?? "Thú cưng";
  const nights = nightsOf(appointment);

  let assignee;
  if (isSpa) {
    const staff = detail.data ? staffNames(detail.data) : [];
    if (!needsStaff || (detail.data && staff.length === 0)) {
      assignee = <span className="text-muted">{appointment.status === "Pending" ? "Chờ quản lý xếp" : "—"}</span>;
    } else if (detail.isPending) {
      assignee = <Skeleton className="h-4 w-24" />;
    } else {
      assignee = staff.length > 0 ? staff.join(", ") : "—";
    }
  } else if (appointment.status === "Cancelled") {
    assignee = <span className="text-muted">—</span>;
  } else if (appointment.cageId) {
    // Đã xếp chuồng nhưng chưa tra được mã: GET /cages chưa có trên backend (thẻ 88, đang trả 405).
    const code = cageCodes.get(appointment.cageId);
    assignee = code ? `Chuồng ${code}` : "Đã xếp chuồng";
  } else {
    assignee = <span className="text-muted">Chờ quản lý xếp</span>;
  }

  return (
    <tr>
      <td className={`${CELL} whitespace-nowrap font-semibold tabular-nums`}>
        {toStoreTime(moment.iso)}
        {moment.label && <div className={`${MUTED} font-normal`}>{moment.label}</div>}
      </td>
      <td className={`${CELL} min-w-[190px]`}>
        <div className="flex min-w-0 items-center gap-3">
          {pet.isPending ? (
            <Skeleton className="size-[34px] rounded-[11px]" />
          ) : (
            <PetAvatar species={pet.data?.species ?? null} size="sm" />
          )}
          <div className="min-w-0">
            <Link
              href={appointmentDetailRoute(appointment.appointmentId)}
              className="block break-words font-semibold text-ink hover:text-lagoon"
            >
              {petName}
            </Link>
            {pet.data && (
              <div className={MUTED}>{speciesAndBreed(pet.data)}</div>
            )}
          </div>
        </div>
      </td>
      {/* Nhãn có tài khoản / vãng lai chưa có trong lịch hẹn (G-05) nên chỉ hiện tên. */}
      <td className={`${CELL} break-words`}>{appointment.customerName ?? "—"}</td>
      <td className={`${CELL} whitespace-nowrap`}>
        {isSpa ? "Spa" : nights !== null ? `Lưu trú, ${nights} đêm` : "Lưu trú"}
      </td>
      <td className={CELL}>{assignee}</td>
      <td className={CELL}>
        <StatusBadge status={appointment.status} />
      </td>
      <td className={`${CELL} text-right`}>
        {/* Thao tác theo trạng thái (UI-Screens SW-02 vùng 3). “Trả thú cưng” thêm ở thẻ 127. */}
        {canCheckIn(appointment, today) ? (
          <ButtonLink href={checkInRoute(appointment.appointmentId)} size="sm">
            Tiếp nhận
          </ButtonLink>
        ) : hasUnpaidSpa ? (
          <ButtonLink href={paymentsRoute(appointment.appointmentId)} size="sm">
            Thu tiền
          </ButtonLink>
        ) : (
          <ButtonLink href={appointmentDetailRoute(appointment.appointmentId)} variant="ghost" size="sm">
            Xem
          </ButtonLink>
        )}
      </td>
    </tr>
  );
}
