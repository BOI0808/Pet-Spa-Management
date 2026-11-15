import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentsScreen } from "@/features/appointments/screens/appointments-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-02 Lịch hẹn. Nhân viên spa: lịch được phân công (thẻ 130). Lễ tân: lịch toàn cửa hàng (thẻ 125), đọc `?date=`
// bằng useSearchParams nên phải nằm trong Suspense (cacheComponents).
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
      <AppointmentsScreen />
    </Suspense>
  );
}
