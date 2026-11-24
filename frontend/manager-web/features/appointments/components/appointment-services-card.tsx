import { ServiceTask } from "@/components/domain/service-task";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { AppointmentDetail } from "@/lib/api/types";
import { toStoreTime } from "@/lib/time";

/**
 * MW-05 vùng 3 – Dịch vụ và tiến độ (FR-EXE-08), chỉ lịch spa. Đầu thẻ ghi “a / b xong”; mỗi dịch vụ một dòng, xong thì tick xanh kèm
 * giờ và ghi chú của nhân viên. Giá từng dịch vụ (cần `GET /services` theo nhóm kích cỡ) không thuộc FR-EXE-08 nên chưa hiện.
 */
export function AppointmentServicesCard({ appointment }: { appointment: AppointmentDetail }) {
  const items = appointment.services ?? [];
  const doneCount = items.filter((item) => item.isDone).length;

  return (
    <Card>
      <CardHeader title="Dịch vụ và tiến độ">
        {items.length > 0 && (
          <span className="text-[13px] text-muted tabular-nums">
            {doneCount} / {items.length} xong
          </span>
        )}
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <p className="text-muted">Chưa có thông tin dịch vụ.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((service) => {
              let detail: string | undefined;
              if (service.isDone) {
                detail = [service.doneAt ? `Xong lúc ${toStoreTime(service.doneAt)}.` : "Đã xong.", service.note ? `Ghi chú: ${service.note}` : ""]
                  .filter(Boolean)
                  .join(" ");
              } else if (appointment.status === "InProgress") {
                detail = "Đang làm";
              }
              return <ServiceTask key={service.serviceId} name={service.name ?? "Dịch vụ"} done={service.isDone} detail={detail} />;
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
