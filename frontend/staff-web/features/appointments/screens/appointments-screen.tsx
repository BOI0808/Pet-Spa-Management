"use client";

// SW-02 Lịch hẹn: cùng đường dẫn `/lich-hen`, nội dung theo vai trò (UI-Screens SW-02).
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/use-session";
import { AssignedAppointmentsScreen } from "./assigned-appointments-screen";

/** Phần lễ tân (lịch toàn cửa hàng, tiếp nhận) làm ở thẻ 125; tới lúc đó giữ trang tạm như trước. */
function ReceptionistPlaceholder() {
  return (
    <div className="mb-6">
      <h1>Lịch hẹn</h1>
      <p className="mt-1 text-muted">Danh sách lịch hẹn sẽ hiển thị ở đây.</p>
    </div>
  );
}

export function AppointmentsScreen() {
  const { me } = useSession();
  if (!me) return <Skeleton className="h-40 w-full rounded-2xl" />;
  return me.staffRole === "SpaStaff" ? <AssignedAppointmentsScreen /> : <ReceptionistPlaceholder />;
}
