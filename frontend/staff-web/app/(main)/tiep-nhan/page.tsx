import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInScreen } from "@/features/check-in/screens/check-in-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-07 Tiếp nhận (chỉ lễ tân). Màn đọc `?appointmentId=` bằng useSearchParams nên phải nằm trong Suspense.
export default function CheckInPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
      <CheckInScreen />
    </Suspense>
  );
}
