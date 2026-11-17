"use client";

import Link from "next/link";
import { useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS, CANCEL_REASON_LABELS } from "@/lib/labels";
import { usePet } from "@/lib/queries/pets";
import { buildPendingHref } from "@/features/pending/params";
import { canCancelAppointment, canChangeAppointment } from "../rules";
import { formatAppointmentSchedule } from "../schedule";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { ChangeHotelAppointmentDialog } from "./change-hotel-appointment-dialog";
import { ChangeSpaAppointmentDialog } from "./change-spa-appointment-dialog";

type AppointmentHeaderCardProps = { appointment: AppointmentDetail };

/**
 * MW-05 vùng 1 (đầu trang + thao tác) – UI-Screens.md. Thẻ 148 làm nút “Hủy lịch” và “Đổi lịch” (FR-CHG-03);
 * các vùng còn lại của MW-05 do thẻ 147 (giám sát, ảnh minh chứng) và 149 (cập nhật trạng thái) làm.
 */
export function AppointmentHeaderCard({ appointment }: AppointmentHeaderCardProps) {
  const [dialog, setDialog] = useState<"cancel" | "change" | null>(null);
  const pet = usePet(appointment.petId).data;
  const code = formatAppointmentCode(appointment.appointmentId);
  const holdingStaff = (appointment.staff ?? []).filter((member) => member.isHolding);

  const summary = [
    `${code}.`,
    `${appointment.customerName ?? "Khách hàng"}.`,
    formatAppointmentSchedule(appointment) && `${formatAppointmentSchedule(appointment)}.`,
    appointment.type === "Spa" &&
      appointment.status !== "Cancelled" &&
      `Nhân viên ${holdingStaff.length > 0 ? holdingStaff.map((member) => member.fullName).join(", ") : "chưa phân công"}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const canCancel = canCancelAppointment(appointment.status);
  const hasSchedule = appointment.type === "Spa" ? Boolean(appointment.slotStart) : Boolean(appointment.plannedCheckIn && appointment.plannedCheckOut);
  const canChange = canChangeAppointment(appointment.status) && hasSchedule;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-5">
        {pet ? (
          <PetAvatar species={pet.species} size="lg" />
        ) : (
          <span aria-hidden="true" className="size-[72px] shrink-0 rounded-[22px] bg-line-soft" />
        )}
        <div className="min-w-40 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1>
              Lịch {APPOINTMENT_TYPE_LABELS[appointment.type].toLocaleLowerCase("vi-VN")} – {appointment.petName ?? "Thú cưng"}
            </h1>
            <StatusBadge status={appointment.status} size="lg" />
          </div>
          <p className="mt-1 text-muted">{summary}</p>
          {appointment.status === "Cancelled" && appointment.cancelReason && (
            <p className="mt-1 text-muted">Lý do hủy: {CANCEL_REASON_LABELS[appointment.cancelReason]}.</p>
          )}
          {appointment.status === "Pending" && (
            <p className="mt-1">
              <Link
                href={buildPendingHref({ filter: "all", appointmentId: appointment.appointmentId })}
                className="font-semibold text-lagoon-700 underline"
              >
                Xử lý ở Chờ xác nhận
              </Link>
            </p>
          )}
        </div>
        {canCancel && (
          <div className="flex flex-wrap items-center gap-2.5 max-[640px]:w-full">
            {canChange && (
              <Button variant="secondary" onClick={() => setDialog("change")}>
                Đổi lịch
              </Button>
            )}
            <Button variant="danger" onClick={() => setDialog("cancel")}>
              Hủy lịch
            </Button>
          </div>
        )}
      </div>

      {dialog === "change" && canChange && appointment.type === "Spa" && (
        <ChangeSpaAppointmentDialog appointment={appointment} onClose={() => setDialog(null)} onChanged={() => setDialog(null)} />
      )}

      {dialog === "change" && canChange && appointment.type === "Hotel" && (
        <ChangeHotelAppointmentDialog appointment={appointment} onClose={() => setDialog(null)} onChanged={() => setDialog(null)} />
      )}

      {dialog === "cancel" && canCancel && (
        <CancelAppointmentDialog
          appointmentId={appointment.appointmentId}
          onClose={() => setDialog(null)}
          onCancelled={() => setDialog(null)}
        />
      )}
    </Card>
  );
}
