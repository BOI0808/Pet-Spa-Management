import { WorkHistoryScreen } from "@/features/work-history/screens/work-history-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-12 Lịch sử công việc, chỉ nhân viên spa (`ROUTE_ROLES.workHistory`; lễ tân gõ thẳng đường dẫn thì thấy ForbiddenState).
export default function WorkHistoryPage() {
  return <WorkHistoryScreen />;
}
