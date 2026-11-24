import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CounterPaymentScreen } from "@/features/payments/screens/counter-payment-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-09 Thanh toán tại quầy (chỉ lễ tân). Màn đọc `?appointmentId=` bằng useSearchParams nên phải nằm trong Suspense.
export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
      <CounterPaymentScreen />
    </Suspense>
  );
}
