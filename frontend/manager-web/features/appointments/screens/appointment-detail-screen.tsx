"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, toApiError } from "@/lib/api/errors";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointmentDetail } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import { AppointmentHeaderCard } from "../components/appointment-header-card";
import { AppointmentLifecycleCard } from "../components/appointment-lifecycle-card";
import { AppointmentPhotosCard } from "../components/appointment-photos-card";
import { AppointmentServicesCard } from "../components/appointment-services-card";

/**
 * MW-05 Chi tiết lịch hẹn (quản lý) – `/lich-hen/[appointmentId]`. Thẻ 148 làm vùng 1 (đầu trang + nút Hủy lịch, Đổi lịch);
 * thẻ 147 làm vùng 2 (vòng đời), 3 (dịch vụ và tiến độ, chỉ spa), 4 (ảnh minh chứng, chỉ spa); thẻ 149 bổ sung vùng 7 (cập nhật trạng thái).
 * Chi tiết tải lại 30 giây/lần khi lịch đang Đã tiếp nhận hoặc Đang thực hiện để tiến độ và ảnh mới hiện ra.
 */
export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const query = useAppointmentDetail(appointmentId, { live: true });
  const backLink = (
    <Link href={ROUTES.appointments} className="font-semibold text-lagoon-700 underline">
      Lịch hẹn
    </Link>
  );

  return (
    <>
      <nav aria-label="Đường dẫn" className="mb-4 text-muted">
        {backLink} › {formatAppointmentCode(appointmentId)}
      </nav>

      {query.data ? (
        <div className="flex flex-col gap-4">
          <AppointmentHeaderCard appointment={query.data} />
          <AppointmentLifecycleCard appointment={query.data} />
          {query.data.type === "Spa" && (
            <>
              <AppointmentServicesCard appointment={query.data} />
              <AppointmentPhotosCard appointment={query.data} />
            </>
          )}
        </div>
      ) : query.isError ? (
        isForbiddenError(query.error) ? (
          <ForbiddenState />
        ) : toApiError(query.error).status === 404 ? (
          <NotFoundState title="Không tìm thấy lịch hẹn" action={backLink} />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={query.error} className="w-full" />
            <Button onClick={() => void query.refetch()}>Thử lại</Button>
          </div>
        )
      ) : (
        <Skeleton className="h-[112px] rounded-2xl" />
      )}
    </>
  );
}
