import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailScreen } from "@/features/appointments/screens/appointment-detail-screen";

// MW-05 Chi tiết lịch hẹn. `AppointmentDetailScreen` đọc `useParams` nên phải nằm trong Suspense (đang bật cacheComponents).
export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}
