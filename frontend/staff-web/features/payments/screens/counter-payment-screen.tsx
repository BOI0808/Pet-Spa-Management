"use client";

// SW-09 Thanh toán tại quầy – UI-Screens.md, UC-23, UC-25, FR-PAY-01, FR-PAY-02, BR-07, BR-09, BR-17, BR-22 (thẻ 128).
// Bố cục giống SW-07: cột trái danh sách khoản cần thu, cột phải thẻ ghi nhận khoản đang chọn (`?appointmentId=`).
import { useSearchParams } from "next/navigation";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/feedback/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { useAppointment, useAppointmentPayments } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { appointmentDetailRoute } from "@/lib/routes";
import { getStoreToday } from "@/lib/time";
import { CounterPaymentCard } from "../components/counter-payment-card";
import { DuePaymentList } from "../components/due-payment-list";
import { findDuePayment, noDueMessage } from "../payments";
import { useDuePayments } from "../use-due-payments";

function SelectedPanel({ appointmentId }: { appointmentId: string }) {
  const appointment = useAppointment(appointmentId);
  const payments = useAppointmentPayments(appointmentId);
  const petId = appointment.data?.petId ?? "";
  const pet = usePet(petId, { enabled: petId !== "" });

  if (appointment.isPending || payments.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (appointment.isError || payments.isError) {
    const error = appointment.error ?? payments.error!;
    if (isForbiddenError(error)) return <ForbiddenState />;
    if (error.status === 404 || error.status === 400) return <NotFoundState title="Không tìm thấy lịch hẹn" />;
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button
          onClick={() => {
            void appointment.refetch();
            void payments.refetch();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  const payment = findDuePayment(appointment.data, payments.data);
  if (!payment) {
    // Không có khoản để thu: báo rõ lý do thay vì hiện ô nhập.
    return (
      <Card>
        <div className="flex flex-col items-start gap-3 p-5">
          <Alert tone="neutral">{noDueMessage(appointment.data, payments.data)}</Alert>
          <ButtonLink href={appointmentDetailRoute(appointmentId)} variant="ghost" size="sm">
            Xem lịch hẹn
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <CounterPaymentCard
      key={payment.paymentId}
      appointment={appointment.data}
      pet={pet.data ?? null}
      payment={payment}
    />
  );
}

/** `/thanh-toan` (`?appointmentId=`). */
export function CounterPaymentScreen() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("appointmentId");
  const today = getStoreToday();
  const due = useDuePayments(today, selectedId);

  const listError = due.error ? (
    <div className="flex flex-col items-start gap-3">
      <ErrorAlert error={due.error} className="w-full" />
      <Button size="sm" onClick={due.retry}>
        Thử lại
      </Button>
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title="Thanh toán tại quầy"
        description="Số tiền do hệ thống tính. Chỉ ghi nhận Đã thanh toán khi nhận đủ tiền."
      />
      <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-6 max-[980px]:grid-cols-1">
        <DuePaymentList
          items={due.items}
          isPending={due.isPending}
          error={listError}
          selectedId={selectedId}
          today={today}
        />
        <div className="min-w-0">
          {selectedId ? (
            <SelectedPanel key={selectedId} appointmentId={selectedId} />
          ) : (
            <Card>
              <EmptyState title="Chọn một khoản trong danh sách để thu tiền." icon="wallet" />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
