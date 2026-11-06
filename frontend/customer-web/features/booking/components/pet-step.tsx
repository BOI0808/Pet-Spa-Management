import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceOption } from "@/components/domain/service-option";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { describePet, type PricedService } from "../spa-booking";

type PetCardProps = {
  pets: Pet[];
  petId: string | null;
  onSelect: (petId: string) => void;
};

/** Vùng 2 – chọn một thú cưng. */
export function PetPickerCard({ pets, petId, onSelect }: PetCardProps) {
  return (
    <Card>
      <CardHeader title="Chọn thú cưng">
        <Link
          href={ROUTES.petNewForBooking}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-lagoon hover:text-lagoon-700"
        >
          <Icon name="plus" className="size-3.5" />
          Thêm thú cưng
        </Link>
      </CardHeader>
      <CardBody>
        <div role="radiogroup" aria-label="Chọn thú cưng" className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
          {pets.map((pet) => (
            <ChoiceCard
              key={pet.petId}
              name="booking-pet"
              value={pet.petId}
              checked={pet.petId === petId}
              onChange={() => onSelect(pet.petId)}
              showDot
            >
              <PetAvatar species={pet.species} />
              <span className="min-w-0">
                <span className="block break-words font-semibold">{pet.name}</span>
                <span className="block break-words text-[13px] leading-[18px] text-muted">{describePet(pet)}</span>
              </span>
            </ChoiceCard>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

type ServiceCardProps = {
  pet: Pet | null;
  services: PricedService[];
  isPending: boolean;
  error: ApiError | null;
  onRetry: () => void;
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
};

/** Vùng 3 – chọn một hoặc nhiều dịch vụ áp dụng cho loài của bé (FR-BOOK-01). */
export function ServicePickerCard({
  pet,
  services,
  isPending,
  error,
  onRetry,
  selectedIds,
  onToggle,
}: ServiceCardProps) {
  let content;
  if (!pet) {
    content = <p className="text-muted">Chọn thú cưng để xem dịch vụ phù hợp.</p>;
  } else if (isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải dịch vụ" className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[70px] rounded-xl" />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button onClick={onRetry}>Thử lại</Button>
      </div>
    );
  } else if (services.length === 0) {
    content = <p className="text-muted">Chưa có dịch vụ cho loài này.</p>;
  } else {
    content = (
      <div className="flex flex-col gap-2">
        <p className="mb-2 text-[13px] leading-[18px] text-muted">
          Chỉ hiện dịch vụ áp dụng cho {SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")}. Giá và thời lượng theo
          nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]}.
        </p>
        {services.map((service) => (
          <ServiceOption
            key={service.serviceId}
            name={service.name}
            durationMinutes={service.durationMinutes}
            latestStartTime={service.latestStartTime}
            price={service.price}
            checked={selectedIds.includes(service.serviceId)}
            onChange={() => onToggle(service.serviceId)}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title={pet ? `Chọn dịch vụ cho ${pet.name}` : "Chọn dịch vụ"}>
        <span className="text-[13px] text-muted">Chọn một hoặc nhiều</span>
      </CardHeader>
      <CardBody>{content}</CardBody>
    </Card>
  );
}
