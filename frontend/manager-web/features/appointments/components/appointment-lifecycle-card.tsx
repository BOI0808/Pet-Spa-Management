import { Lifecycle } from "@/components/domain/lifecycle";
import { Card, CardBody } from "@/components/ui/card";
import type { AppointmentDetail } from "@/lib/api/types";
import { lifecycleSteps } from "../lifecycle";

/** MW-05 vùng 2 – Vòng đời (FR-EXE-08): spa 5 bước, lưu trú 4 bước; lịch hủy dừng ở bước cuối đã đạt kèm chấm đỏ “Đã hủy”. */
export function AppointmentLifecycleCard({ appointment }: { appointment: AppointmentDetail }) {
  return (
    <Card>
      <CardBody>
        <Lifecycle label="Tiến trình lịch hẹn" steps={lifecycleSteps(appointment)} />
      </CardBody>
    </Card>
  );
}
