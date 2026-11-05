import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PetFormScreen } from "@/features/pets/screens/pet-form-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// PetFormScreen đọc `?returnTo=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function NewPetPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
      <PetFormScreen />
    </Suspense>
  );
}
