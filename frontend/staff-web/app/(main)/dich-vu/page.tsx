import { ServicesScreen } from "@/features/services/screens/services-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-14 Danh mục dịch vụ (lễ tân và nhân viên spa, chỉ xem).
export default function ServicesPage() {
  return <ServicesScreen />;
}
