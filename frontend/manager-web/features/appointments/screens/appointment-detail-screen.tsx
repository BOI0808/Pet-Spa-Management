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

/**
 * MW-05 Chi tiết lịch hẹn (quản lý) – `/lich-hen/[appointmentId]`. Hiện mới có vùng 1 (đầu trang + nút Hủy lịch, Đổi lịch) của thẻ 148;
 * thẻ 147 và 149 bổ sung các vùng còn lại. Chưa có MW-03 (thẻ 147) nên vào trang bằng đường dẫn có mã lịch.
 */
export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const query = useAppointmentDetail(appointmentId);
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
        <AppointmentHeaderCard appointment={query.data} />
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
