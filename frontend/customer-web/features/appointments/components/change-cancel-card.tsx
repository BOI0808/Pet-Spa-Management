"use client";

// CW-09 vùng 8 “Đổi hoặc hủy” và hộp thoại CW-09·D1 – UI-Screens.md, FR-CHG-01, FR-CHG-02, BR-08.
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { DisabledReason } from "@/features/booking/components/disabled-reason";
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail } from "@/lib/api/types";
import { useCancelAppointment, useChangeWindowClosed } from "@/lib/queries/appointment-changes";
import { ROUTES } from "@/lib/routes";
import {
  CHANGE_LOCKED_MESSAGE,
  MIN_CHANGE_DEADLINE_MINUTES,
  getChangeAccess,
  useNow,
} from "../change-window";

/** Lý do nút bị khóa (`.btn-reason` của ui-demo). */
export function ChangeLockedReason() {
  return (
    <div className="mt-2">
      <DisabledReason>{CHANGE_LOCKED_MESSAGE}</DisabledReason>
    </div>
  );
}

/** “Badge Đã hủy” trong câu của hộp thoại (`.badge.st-6`). */
function CancelledBadge() {
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-st-cancelled-bg px-2.5 align-middle text-xs font-semibold text-st-cancelled">
      Đã hủy
    </span>
  );
}

type CancelDialogProps = {
  open: boolean;
  loading: boolean;
  error: ApiError | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** CW-09·D1 Hủy lịch hẹn này? */
function CancelDialog({ open, loading, error, onClose, onConfirm }: CancelDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hủy lịch hẹn này?"
      description="Bạn đang trong thời hạn tự hủy nên không mất phí."
      icon="x-circle"
      tone="danger"
      busy={loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Giữ lịch
          </Button>
          <Button variant="danger-solid" loading={loading} onClick={onConfirm}>
            Hủy lịch hẹn
          </Button>
        </>
      }
    >
      <p>
        Lịch chuyển sang <CancelledBadge /> với lý do khách hàng chủ động hủy. Thao tác không hoàn tác được; muốn đến
        cửa hàng, bạn cần đặt lịch mới.
      </p>
      {error && <ErrorAlert error={error} className="mt-3" />}
    </Modal>
  );
}

/** Vùng 8: chỉ hiện khi lịch chưa hoàn tất/chưa hủy. */
export function ChangeCancelCard({ appointment }: { appointment: AppointmentDetail }) {
  const { showSuccess } = useToast();
  const now = useNow();
  const knownClosed = useChangeWindowClosed(appointment.appointmentId);
  const cancel = useCancelAppointment(appointment.appointmentId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const access = getChangeAccess(appointment, now, knownClosed);
  if (access === "hidden") return null;

  function openDialog() {
    cancel.reset();
    setDialogOpen(true);
  }

  function confirmCancel() {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setDialogOpen(false);
        showSuccess("Đã hủy lịch hẹn");
      },
      // 409 quá hạn: đóng hộp thoại, khối chuyển sang trạng thái quá hạn với lý do dưới nút (UI-Screens CW-09).
      // Lỗi khác hiện trong hộp thoại; 409 nào cũng tải lại chi tiết (`useCancelAppointment`).
      onError: (error) => {
        if (error.code === "CHANGE_WINDOW_CLOSED") setDialogOpen(false);
      },
    });
  }

  const dialogError = cancel.error && cancel.error.code !== "CHANGE_WINDOW_CLOSED" ? cancel.error : null;

  return (
    <Card>
      <CardHeader title="Đổi hoặc hủy" />
      <CardBody>
        {access === "open" ? (
          <>
            <p className="mb-3 text-[13px] leading-[18px] text-muted">
              Bạn có thể tự đổi hoặc hủy miễn phí trước giờ hẹn theo thời hạn của cửa hàng (ít nhất{" "}
              {MIN_CHANGE_DEADLINE_MINUTES} phút).
              {appointment.status === "Confirmed" && " Đổi lịch đã xác nhận sẽ đưa lịch về Chờ xác nhận."}
            </p>
            <div className="flex gap-2">
              <ButtonLink
                href={ROUTES.appointmentChange(appointment.appointmentId)}
                variant="secondary"
                className="min-w-0 flex-1"
              >
                <Icon name="swap" />
                Đổi lịch
              </ButtonLink>
              <Button variant="danger" className="min-w-0 flex-1" onClick={openDialog}>
                Hủy lịch
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button className="min-w-0 flex-1" disabled>
                Đổi lịch
              </Button>
              <Button className="min-w-0 flex-1" disabled>
                Hủy lịch
              </Button>
            </div>
            <ChangeLockedReason />
          </>
        )}
      </CardBody>
      <CancelDialog
        open={dialogOpen}
        loading={cancel.isPending}
        error={dialogError}
        onClose={() => setDialogOpen(false)}
        onConfirm={confirmCancel}
      />
    </Card>
  );
}
