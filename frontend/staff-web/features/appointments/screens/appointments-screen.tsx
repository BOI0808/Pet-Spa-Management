"use client";

// SW-02 Lịch hẹn: cùng đường dẫn `/lich-hen`, nội dung theo vai trò (UI-Screens SW-02).
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth/use-session";
import { AssignedAppointmentsScreen } from "./assigned-appointments-screen";
import { ReceptionAppointmentsScreen } from "./reception-appointments-screen";

export function AppointmentsScreen() {
  const { me } = useSession();
  if (!me) return <Skeleton className="h-40 w-full rounded-2xl" />;
  // Nhân viên spa: lịch được phân công (thẻ 130). Lễ tân: lịch toàn cửa hàng theo ngày (thẻ 125).
  return me.staffRole === "SpaStaff" ? <AssignedAppointmentsScreen /> : <ReceptionAppointmentsScreen />;
}
