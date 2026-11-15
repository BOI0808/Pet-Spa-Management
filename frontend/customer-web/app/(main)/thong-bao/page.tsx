import { Suspense } from "react";
import { NotificationsScreen, NotificationsSkeleton } from "@/features/notifications/screens/notifications-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// NotificationsScreen đọc `?tab=` bằng useSearchParams nên phải bọc Suspense (Frontend-Architecture 4.1).
export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsScreen />
    </Suspense>
  );
}
