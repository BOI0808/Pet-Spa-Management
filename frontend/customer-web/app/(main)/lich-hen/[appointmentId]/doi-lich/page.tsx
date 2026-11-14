import { Suspense } from "react";
import {
  ChangeAppointmentScreen,
  ChangeAppointmentSkeleton,
} from "@/features/appointments/screens/change-appointment-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// ChangeAppointmentScreen đọc `appointmentId` bằng useParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function ChangeAppointmentPage() {
  return (
    <Suspense fallback={<ChangeAppointmentSkeleton />}>
      <ChangeAppointmentScreen />
    </Suspense>
  );
}
