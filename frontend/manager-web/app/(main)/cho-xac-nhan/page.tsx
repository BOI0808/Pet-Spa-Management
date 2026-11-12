import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingScreen } from "@/features/pending/screens/pending-screen";

// MW-04 Xử lý lịch hẹn chờ xác nhận. `PendingScreen` đọc `useSearchParams` (?type, ?appointmentId) nên phải nằm trong Suspense (đang bật cacheComponents).
export default function PendingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <PendingScreen />
    </Suspense>
  );
}
