import { Suspense } from "react";
import { HistoryScreen, HistorySkeleton } from "@/features/appointments/screens/history-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// HistoryScreen đọc `?petId=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryScreen />
    </Suspense>
  );
}
