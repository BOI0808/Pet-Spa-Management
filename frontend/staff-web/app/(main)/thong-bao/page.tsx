import { NotificationsScreen } from "@/features/notifications/screens/notifications-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-13 Thông báo, chỉ nhân viên spa (`ROUTE_ROLES.notifications`; lễ tân gõ thẳng đường dẫn thì thấy ForbiddenState).
export default function NotificationsPage() {
  return <NotificationsScreen />;
}
