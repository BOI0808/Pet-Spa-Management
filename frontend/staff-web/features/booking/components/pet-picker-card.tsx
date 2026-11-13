import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import type { Pet } from "@/lib/api/types";
import { petCreateRoute } from "@/lib/routes";
import { describePet } from "../spa-booking";

type PetPickerCardProps = {
  customerId: string;
  pets: Pet[];
  petId: string | null;
  onSelect: (petId: string) => void;
};

/** SW-06 vùng 3 – chọn một thú cưng của khách; dùng chung cho tab Lịch spa và Lưu trú. */
export function PetPickerCard({ customerId, pets, petId, onSelect }: PetPickerCardProps) {
  return (
    <Card>
      <CardHeader title="Thú cưng">
        <Link
          href={petCreateRoute(customerId)}
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
