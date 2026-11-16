import { AppointmentsScreen } from "@/features/appointments/screens/appointments-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-02 Lịch hẹn. Nhân viên spa: lịch được phân công (thẻ 130). Lễ tân: lịch toàn cửa hàng (thẻ 125).
export default function AppointmentsPage() {
  return <AppointmentsScreen />;
}
