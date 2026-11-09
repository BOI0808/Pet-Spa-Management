import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomersScreen } from "@/features/customers/screens/customers-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-04 Khách hàng (chỉ lễ tân). Màn đọc `?search=` bằng useSearchParams nên phải nằm trong Suspense (cacheComponents).
export default function CustomersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
      <CustomersScreen />
    </Suspense>
  );
}
