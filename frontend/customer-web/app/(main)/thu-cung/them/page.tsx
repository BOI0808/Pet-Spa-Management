import { PetFormScreen } from "@/features/pets/screens/pet-form-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

export default function NewPetPage() {
  return <PetFormScreen />;
}
