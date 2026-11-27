"use client";

import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { serviceExecutionRoute } from "@/lib/routes";
import { toStoreDate } from "@/lib/time";
import { formatSlotRange } from "../../appointments/appointments";

const CELL = "border-b border-line-soft px-4 py-3 align-middle";

/**
 * Một dòng bảng SW-12 (UI-Screens SW-12 vùng 2). Danh sách lịch không có tên dịch vụ và loài của bé (G-05) nên mỗi
 * dòng tải thêm chi tiết lịch và hồ sơ bé; chỉ các dòng của trang đang xem (tối đa 20) mới tải, bộ đệm giữ khi quay lại.
 */
export function WorkHistoryRow({ appointment }: { appointment: Appointment }) {
  const pet = usePet(appointment.petId);
  const detail = useAppointment(appointment.appointmentId);

  let services;
  if (detail.isPending) {
    services = <Skeleton className="h-4 w-40" />;
  } else {
    const names = (detail.data?.services ?? []).map((service) => service.name).filter(Boolean);
    // Tải lỗi hoặc không có tên: không chặn cả bảng, chỉ để trống ô này.
    services = names.length > 0 ? names.join(", ") : <span className="text-muted">—</span>;
  }

  return (
    <tr>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>
        {appointment.slotStart ? formatDate(toStoreDate(appointment.slotStart)) : "—"}
      </td>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>{formatSlotRange(appointment) || "—"}</td>
      <td className={`${CELL} min-w-[150px]`}>
        <div className="flex min-w-0 items-center gap-3">
          {pet.isPending ? (
            <Skeleton className="size-[34px] rounded-[11px]" />
          ) : (
            <PetAvatar species={pet.data?.species ?? null} size="sm" />
          )}
          <span className="break-words font-semibold">{appointment.petName ?? pet.data?.name ?? "Thú cưng"}</span>
        </div>
      </td>
      <td className={`${CELL} min-w-[200px] break-words`}>{services}</td>
      <td className={CELL}>
        <StatusBadge status={appointment.status} />
      </td>
      <td className={`${CELL} text-right`}>
        {/* SW-11 với lịch Hoàn tất chỉ xem: các nút thao tác đã khóa theo trạng thái. */}
        <ButtonLink href={serviceExecutionRoute(appointment.appointmentId)} variant="ghost" size="sm">
          Xem
        </ButtonLink>
      </td>
    </tr>
  );
}
