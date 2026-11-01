import { PetsScreen } from "@/features/pets/screens/pets-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

export default function PetsPage() {
  return <PetsScreen />;
}
