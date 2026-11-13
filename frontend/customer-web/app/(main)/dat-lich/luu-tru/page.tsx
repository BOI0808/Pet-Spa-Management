import { Suspense } from "react";
import { HotelBookingScreen } from "@/features/booking/screens/hotel-booking-screen";
import { BookingSkeleton } from "@/features/booking/screens/spa-booking-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// HotelBookingScreen đọc `?petId=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function HotelBookingPage() {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <HotelBookingScreen />
    </Suspense>
  );
}
