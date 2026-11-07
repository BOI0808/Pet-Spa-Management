import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PetFormScreen } from "@/features/pets/screens/pet-form-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-05 Xem và sửa hồ sơ thú cưng của khách đang phục vụ.
// PetFormScreen đọc `customerId`, `petId` bằng useParams; với cacheComponents, tham số động chỉ biết lúc request
// nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function EditPetPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
      <PetFormScreen />
    </Suspense>
  );
}
