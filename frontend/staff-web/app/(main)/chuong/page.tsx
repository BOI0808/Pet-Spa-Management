import { CagesScreen } from "@/features/cages/screens/cages-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-08 Tình trạng chuồng (chỉ lễ tân).
export default function CagesPage() {
  return <CagesScreen />;
}
