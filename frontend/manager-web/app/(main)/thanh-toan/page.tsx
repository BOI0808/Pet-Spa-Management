import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentsScreen } from "@/features/payments/screens/payments-screen";

// MW-10 Thanh toán. `PaymentsScreen` đọc `useSearchParams` (?status) nên phải nằm trong Suspense (đang bật cacheComponents).
export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <PaymentsScreen />
    </Suspense>
  );
}
