import { Suspense } from "react";
import {
  ServiceExecutionScreen,
  ServiceExecutionSkeleton,
} from "@/features/service-execution/screens/service-execution-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

// SW-11 Thực hiện dịch vụ. Màn đọc `[appointmentId]` bằng useParams nên nằm trong Suspense như các màn có tham số động.
export default function ServiceExecutionPage() {
  return (
    <Suspense fallback={<ServiceExecutionSkeleton />}>
      <ServiceExecutionScreen />
    </Suspense>
  );
}
