import type { ReactNode } from "react";
import { PetLine } from "@/components/domain/pet-line";
import { SumFact, SumLine, SumTotal } from "@/components/domain/summary";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import type { PricedService } from "../spa-booking";

type BookingSummaryProps = {
  pet: Pet | null;
  services: PricedService[];
  durationMinutes: number;
  staffRequired: number;
  /** Từ bước 2 mới hiện dòng Thời gian; `null` khi chưa chọn mốc. */
  timeRange?: string | null;
  total: number;
  /** Nút theo bước. */
  children: ReactNode;
};

/** Vùng 4 – tóm tắt lịch hẹn, dính bên phải khi cuộn. */
export function BookingSummary({
  pet,
  services,
  durationMinutes,
  staffRequired,
  timeRange,
  total,
  children,
}: BookingSummaryProps) {
  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardHeader title="Tóm tắt lịch hẹn" />
        <CardBody>
          {pet ? (
            <PetLine
              species={pet.species}
              name={pet.name}
              meta={`${SPECIES_LABELS[pet.species]}, ${pet.breed}, ${formatWeight(pet.weightKg)}`}
            >
              <Tag tone="size">Nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]}</Tag>
            </PetLine>
          ) : (
            <p className="text-muted">Chưa chọn thú cưng.</p>
          )}
          <div className="my-3 h-px bg-line-soft" />
          {services.length > 0 ? (
            services.map((service) => (
              <SumLine
                key={service.serviceId}
                label={service.name}
                note={`${service.durationMinutes} phút`}
                amount={service.price}
              />
            ))
          ) : (
            <p className="py-2 text-muted">Chưa chọn dịch vụ.</p>
          )}
          <div className="mt-2 rounded-xl bg-mist px-3 py-2.5 text-[13px]">
            <SumFact label="Thời lượng">{durationMinutes} phút</SumFact>
            <SumFact label="Số nhân viên cần">{staffRequired}</SumFact>
            {timeRange !== undefined && <SumFact label="Thời gian">{timeRange ?? "Chưa chọn"}</SumFact>}
          </div>
          <SumTotal label="Tạm tính" amount={total} note="Chưa gồm thay đổi khi cân thực tế" />
        </CardBody>
        <CardFooter>
          <div className="flex w-full flex-col gap-2.5">{children}</div>
        </CardFooter>
      </Card>
    </aside>
  );
}
