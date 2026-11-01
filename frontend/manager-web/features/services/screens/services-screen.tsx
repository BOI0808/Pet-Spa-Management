"use client";

// MW-06 Danh mục dịch vụ – UI-Screens.md (UC-08, FR-SVC-01 → 03)
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Service } from "@/lib/api/types";
import { useServices } from "@/lib/queries/services";
import { ServiceFormDrawer } from "../components/service-form-drawer";
import { ServiceRow, cellClass } from "../components/service-row";
import { StopServiceDialog } from "../components/stop-service-dialog";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

/** Đang mở ngăn kéo thêm (`"new"`) hoặc sửa một dịch vụ; `null` là đóng. */
type DrawerState = "new" | Service | null;

function ServiceTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index}>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="mt-1.5 h-3 w-56" />
          </td>
          <td className={cellClass}>
            <Skeleton className="size-[34px] rounded-[11px]" />
          </td>
          <td className={cellClass}>
            <Skeleton className="ml-auto h-3.5 w-16" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3.5 w-12" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-6 w-24" />
          </td>
          <td className={cellClass}>
            <Skeleton className="ml-auto h-8 w-24" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function ServicesScreen() {
  const services = useServices();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [stopping, setStopping] = useState<Service | null>(null);

  const activeCount = services.data?.filter((service) => service.isActive).length ?? 0;
  const stoppedCount = (services.data?.length ?? 0) - activeCount;
  const addButton = (
    <Button variant="primary" onClick={() => setDrawer("new")}>
      <Icon name="plus" />
      Thêm dịch vụ
    </Button>
  );

  // Vùng 1 – Tiêu đề; vùng 2 – Bảng; vùng 3 – Ghi chú.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Dịch vụ</h1>
          <p className="mt-1 text-muted">
            {services.data && `${activeCount} dịch vụ đang cung cấp, ${stoppedCount} đã ngừng. `}
            Giá, thời lượng, số nhân viên đặt theo loài và nhóm kích cỡ.
          </p>
        </div>
        {addButton}
      </div>

      {services.data === undefined && services.isError ? (
        isForbiddenError(services.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={services.error} className="w-full" />
            <Button onClick={() => void services.refetch()}>Thử lại</Button>
          </div>
        )
      ) : services.data?.length === 0 ? (
        <Card>
          <EmptyState
            icon="scissors"
            title="Chưa có dịch vụ nào"
            description="Thêm dịch vụ đầu tiên để khách hàng có thể đặt lịch spa."
            action={<Button onClick={() => setDrawer("new")}>Thêm dịch vụ</Button>}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={headCellClass}>Dịch vụ</th>
                  <th className={headCellClass}>Loài áp dụng</th>
                  <th className={`${headCellClass} text-right max-[980px]:text-left`}>Giá từ</th>
                  <th className={headCellClass}>Bắt đầu muộn nhất</th>
                  <th className={headCellClass}>Trạng thái</th>
                  <th className={`${headCellClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {services.data ? (
                  services.data.map((service) => (
                    <ServiceRow
                      key={service.serviceId}
                      service={service}
                      onEdit={() => setDrawer(service)}
                      onStop={() => setStopping(service)}
                    />
                  ))
                ) : (
                  <ServiceTableSkeleton />
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-3 text-xs text-muted">
        Dịch vụ đã ngừng không còn hiển thị khi khách đặt lịch mới. Giá và thời lượng sửa xong áp dụng cho các lượt đặt lịch
        tiếp theo.
      </p>

      {drawer !== null && (
        <ServiceFormDrawer service={drawer === "new" ? null : drawer} onClose={() => setDrawer(null)} />
      )}
      {stopping && <StopServiceDialog service={stopping} onClose={() => setStopping(null)} />}
    </>
  );
}
