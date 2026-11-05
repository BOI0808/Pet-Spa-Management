import { SpaBookingScreen } from "@/features/booking/screens/spa-booking-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

export default function SpaBookingPage() {
  return <SpaBookingScreen />;
}
