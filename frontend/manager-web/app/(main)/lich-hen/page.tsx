import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentListScreen } from "@/features/appointments/screens/appointment-list-screen";

// MW-03 Danh sách lịch hẹn. `AppointmentListScreen` đọc `useSearchParams` (?type, ?status, ?date, ?page) nên phải nằm trong Suspense (đang bật cacheComponents).
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <AppointmentListScreen />
    </Suspense>
  );
}
