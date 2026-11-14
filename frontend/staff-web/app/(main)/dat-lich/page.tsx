import { Suspense } from "react";
import { BookForCustomerScreen, BookingSkeleton } from "@/features/booking/screens/book-for-customer-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-06 Đặt lịch thay khách (chỉ lễ tân). Màn đọc `?customerId=&petId=&type=` bằng useSearchParams nên phải nằm
// trong Suspense (cacheComponents).
export default function BookForCustomerPage() {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookForCustomerScreen />
    </Suspense>
  );
}
