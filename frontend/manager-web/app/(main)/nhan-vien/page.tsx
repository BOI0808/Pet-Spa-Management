import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffScreen } from "@/features/staff/screens/staff-screen";

// MW-08 Nhân viên. `StaffScreen` đọc `useSearchParams` (?filter) nên phải nằm trong Suspense (đang bật cacheComponents).
export default function StaffPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <StaffScreen />
    </Suspense>
  );
}
