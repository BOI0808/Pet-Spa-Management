import type { Pet } from "@/lib/api/types";
import { formatDecimal, formatWeight } from "@/lib/format";
import { SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-mist px-3.5 py-3 ${wide ? "col-span-full" : ""}`}>
      <dt className="text-xs leading-4 text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

/** Hồ sơ thú cưng chỉ xem của Quản lý (FR-PET-02). Chiều cao, lông, ghi chú chỉ hiện khi khách đã khai. */
export function PetProfile({ pet }: { pet: Pet }) {
  return (
    <dl className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-2">
      <Field label="Loài" value={SPECIES_LABELS[pet.species]} />
      <Field label="Giống" value={pet.breed} />
      <Field label="Tính cách" value={TEMPERAMENT_LABELS[pet.temperament]} />
      <Field label="Cân nặng" value={formatWeight(pet.weightKg)} />
      {pet.heightCm != null && <Field label="Chiều cao" value={`${formatDecimal(pet.heightCm)} cm`} />}
      {pet.coatNote && <Field label="Đặc điểm lông" value={pet.coatNote} wide />}
      {pet.notes && <Field label="Ghi chú của khách" value={pet.notes} wide />}
    </dl>
  );
}
