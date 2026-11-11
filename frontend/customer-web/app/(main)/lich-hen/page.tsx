import { Suspense } from "react";
import { AppointmentsScreen, AppointmentsSkeleton } from "@/features/appointments/screens/appointments-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// AppointmentsScreen đọc `?tab=`, `?type=`, `?page=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <AppointmentsScreen />
    </Suspense>
  );
}
