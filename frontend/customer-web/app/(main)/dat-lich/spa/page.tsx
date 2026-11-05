import { Suspense } from "react";
import { BookingSkeleton, SpaBookingScreen } from "@/features/booking/screens/spa-booking-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SpaBookingScreen đọc `?petId=`, `?step=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function SpaBookingPage() {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <SpaBookingScreen />
    </Suspense>
  );
}
