"use client";

import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { Dropdown, dropdownDangerItemClass, dropdownItemClass } from "@/components/layout/dropdown";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import type { Pet } from "@/lib/api/types";
import { formatDecimal, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

/** “<Loài> <giống>” (UI-Screens CW-04); giống đã bắt đầu bằng tên loài (“Mèo Anh lông ngắn”) thì không lặp. */
function speciesLine(pet: Pet) {
  const species = SPECIES_LABELS[pet.species];
  return pet.breed.toLocaleLowerCase("vi-VN").startsWith(species.toLocaleLowerCase("vi-VN"))
    ? pet.breed
    : `${species} ${pet.breed}`;
}

function Stat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`break-words font-semibold tabular-nums ${muted ? "text-muted" : ""}`}>{value}</div>
    </div>
  );
}

type PetCardProps = {
  pet: Pet;
  /** Mở hộp thoại CW-04·D1. */
  onRemove: (pet: Pet) => void;
};

/** Thẻ thú cưng (CW-04 vùng 2). Nhóm kích cỡ là `sizeGroup` do backend xác định. */
export function PetCard({ pet, onRemove }: PetCardProps) {
  const isDog = pet.species === "Dog";

  return (
    <Card className="flex flex-col">
      <div className="flex-1 p-5">
        <div className="flex items-start gap-4">
          <PetAvatar species={pet.species} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="break-words">{pet.name}</h2>
            <div className="break-words text-muted">{speciesLine(pet)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag tone="size">Nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]}</Tag>
              <Tag>{TEMPERAMENT_LABELS[pet.temperament]}</Tag>
            </div>
          </div>
          <Dropdown
            align="right"
            buttonLabel={`Thêm thao tác cho ${pet.name}`}
            buttonClassName="-mr-1 -mt-1 grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-ink hover:bg-mist"
            label={<Icon name="dots" />}
          >
            <Link href={ROUTES.petEdit(pet.petId)} className={dropdownItemClass}>
              <Icon name="edit" />
              Sửa hồ sơ
            </Link>
            <Link href={ROUTES.historyForPet(pet.petId)} className={dropdownItemClass}>
              <Icon name="history" />
              Lịch sử dịch vụ
            </Link>
            <div className="mx-1 my-1.5 h-px bg-line" />
            <button type="button" onClick={() => onRemove(pet)} className={`${dropdownDangerItemClass} cursor-pointer`}>
              <Icon name="trash" />
              Gỡ hồ sơ
            </button>
          </Dropdown>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Cân nặng" value={formatWeight(pet.weightKg)} />
          {isDog ? (
            <Stat label="Cao vai" value={pet.heightCm != null ? `${formatDecimal(pet.heightCm)} cm` : "—"} />
          ) : (
            <Stat label="Cao vai" value="Không cần" muted />
          )}
          <Stat label="Lông" value={pet.coatNote || "—"} muted={!pet.coatNote} />
        </div>
        {pet.notes && <p className="mt-3 break-words text-xs text-muted">Ghi chú: {pet.notes}</p>}
      </div>
      <CardFooter>
        <ButtonLink href={ROUTES.spaBookingForPet(pet.petId)} size="sm">
          Đặt lịch spa
        </ButtonLink>
        <ButtonLink href={ROUTES.petEdit(pet.petId)} variant="ghost" size="sm">
          Sửa hồ sơ
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
