"use client";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, toApiError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { usePet } from "@/lib/queries/pets";
import { PetProfile } from "./pet-profile";

// Thẻ chi tiết của MW-04: vùng 3 (đầu thẻ) và hồ sơ thú cưng chỉ xem (FR-PET-02).
// Thẻ 144 (spa) và 145 (lưu trú) thêm các vùng 4 – 6 bên dưới hồ sơ.
export function PendingDetailCard({ appointment }: { appointment: Appointment }) {
  const petQuery = usePet(appointment.petId);
  const pet = petQuery.data;
  const petName = appointment.petName ?? "Thú cưng";

  // UI-Screens MW-04 vùng 3: “Mochi, mèo Anh lông ngắn, nhóm Vừa”. Chưa có hồ sơ thì chỉ hiện tên từ danh sách.
  const heading = pet
    ? `${pet.name}, ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`
    : petName;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-5">
        {pet ? (
          <PetAvatar species={pet.species} size="lg" />
        ) : (
          <span aria-hidden="true" className="size-[72px] shrink-0 rounded-[22px] bg-line-soft" />
        )}
        <div className="min-w-40 flex-1">
          <h2>{heading}</h2>
          <p className="mt-1 text-muted">
            {formatAppointmentCode(appointment.appointmentId)}. {appointment.customerName ?? "Khách hàng"}
          </p>
        </div>
        <StatusBadge status={appointment.status} size="lg" />
      </div>

      <div className="border-t border-line-soft p-5">
        <h3 className="mb-3">Hồ sơ thú cưng</h3>
        {pet ? (
          <PetProfile pet={pet} />
        ) : petQuery.isError ? (
          isForbiddenError(petQuery.error) ? (
            <ForbiddenState />
          ) : toApiError(petQuery.error).status === 404 ? (
            <NotFoundState title="Không tìm thấy hồ sơ thú cưng" />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <ErrorAlert error={petQuery.error} className="w-full" />
              <Button onClick={() => void petQuery.refetch()}>Thử lại</Button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[62px] rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
