import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckOutScreen } from "@/features/check-out/screens/check-out-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-10 Trả thú cưng lưu trú (chỉ lễ tân). Màn đọc `?appointmentId=` bằng useSearchParams nên phải nằm trong Suspense.
export default function CheckOutPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
      <CheckOutScreen />
    </Suspense>
  );
}
