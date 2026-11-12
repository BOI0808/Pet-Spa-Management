import { Suspense } from "react";
import {
  AppointmentDetailScreen,
  AppointmentDetailSkeleton,
} from "@/features/appointments/screens/appointment-detail-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// AppointmentDetailScreen đọc `appointmentId` bằng useParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<AppointmentDetailSkeleton />}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}
