import { Suspense } from "react";
import {
  AppointmentDetailScreen,
  AppointmentDetailSkeleton,
} from "@/features/appointments/screens/appointment-detail-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-03 Chi tiết lịch hẹn. Màn đọc `[appointmentId]` bằng useParams nên nằm trong Suspense như các màn có tham số động.
export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<AppointmentDetailSkeleton />}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}
