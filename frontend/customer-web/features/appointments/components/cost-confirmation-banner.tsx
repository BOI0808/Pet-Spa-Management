"use client";

// CW-09 vùng 3 “Banner xác nhận chi phí mới” và hộp thoại CW-09·D2 – UI-Screens.md, FR-EXE-11, BR-23, UF-10.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Countdown } from "@/components/feedback/countdown";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CostConfirmation, Pet } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";
import { appointmentKeys } from "@/lib/queries/appointments";
import { useRespondCostConfirmation } from "@/lib/queries/cost-confirmation";
import { toStoreTime } from "@/lib/time";

/** Yêu cầu đã hết hạn hoặc không còn (409 `COST_CONFIRMATION_EXPIRED`, 404) – Frontend-Conventions **(Đề xuất)**. */
const EXPIRED_MESSAGE = "Yêu cầu xác nhận chi phí đã hết hạn.";

function isExpiredError(error: ApiError) {
  return error.code === "COST_CONFIRMATION_EXPIRED" || error.status === 404;
}

/** “Badge Đã hủy” trong câu của hộp thoại (`.badge.st-6`). */
function CancelledBadge() {
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-st-cancelled-bg px-2.5 align-middle text-xs font-semibold text-st-cancelled">
      Đã hủy
    </span>
  );
}

type RejectDialogProps = {
  open: boolean;
  appointment: AppointmentDetail;
  petName: string;
  loading: boolean;
  error: ApiError | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** CW-09·D2 Từ chối chi phí mới? */
function RejectDialog({ open, appointment, petName, loading, error, onClose, onConfirm }: RejectDialogProps) {
  const isSpa = appointment.type === "Spa";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Từ chối chi phí mới?"
      description={`${isSpa ? "Lịch spa" : "Lịch lưu trú"} ${formatAppointmentCode(appointment.appointmentId)} của ${petName} sẽ bị hủy.`}
      icon="alert"
      tone="danger"
      busy={loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Quay lại
          </Button>
          <Button variant="danger-solid" loading={loading} onClick={onConfirm}>
            Từ chối và hủy lịch
          </Button>
        </>
      }
    >
      <p>
        Lịch chuyển sang <CancelledBadge /> với lý do không xác nhận chi phí mới. {petName}{" "}
        {isSpa ? "chưa được chăm sóc" : "chưa vào chuồng"}, bạn có thể đón bé tại quầy.
      </p>
      {error && <ErrorAlert error={error} className="mt-3" />}
    </Modal>
  );
}

type BannerProps = {
  pending: CostConfirmation;
  appointment: AppointmentDetail;
  pet: Pet | null;
  petName: string;
  busy: boolean;
  accepting: boolean;
  onAccept: () => void;
  onReject: () => void;
  onExpire: () => void;
};

/** `.cost-banner` của ui-demo: ô cân Apricot, tiêu đề + đếm ngược, mô tả, số tiền cũ gạch → mới, 2 nút. */
function Banner({ pending, appointment, pet, petName, busy, accepting, onAccept, onReject, onExpire }: BannerProps) {
  const oldGroup = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const newGroup = SIZE_GROUP_LABELS[pending.newSizeGroup];
  return (
    <section
      aria-labelledby="cost-banner-title"
      className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[#F1D9A2] bg-[#FFF6E3] px-5 py-[18px] max-[640px]:grid-cols-[minmax(0,1fr)]"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-apricot text-ink">
        <Icon name="scale" className="size-[22px]" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="cost-banner-title">Cần bạn xác nhận chi phí mới</h2>
          <Countdown expiresAt={pending.expiresAt} onExpire={onExpire} />
        </div>
        <p className="mt-1">
          {petName} nặng <b>{formatWeight(pending.actualWeightKg)}</b> khi cân tại cửa hàng
          {pet ? ` (hồ sơ: ${formatWeight(pet.weightKg)})` : ""}, chuyển từ nhóm {oldGroup} lên nhóm <b>{newGroup}</b>.
          Từ chối hoặc không phản hồi trước {toStoreTime(pending.expiresAt)}, lịch hẹn sẽ bị hủy.
        </p>
        <div className="mt-1.5 flex items-center gap-2.5 tabular-nums">
          <span className="text-muted line-through">
            <span className="sr-only">Chi phí cũ </span>
            {formatMoney(pending.oldAmount)}
          </span>
          <Icon name="arrow-r" className="size-4 text-muted" />
          <span className="text-[17px] font-bold">
            <span className="sr-only">Chi phí mới </span>
            {formatMoney(pending.newAmount)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 max-[640px]:flex-row max-[640px]:flex-wrap">
        <Button variant="primary" loading={accepting} disabled={busy && !accepting} onClick={onAccept}>
          Đồng ý chi phí mới
        </Button>
        <Button variant="danger" disabled={busy} onClick={onReject}>
          Từ chối
        </Button>
      </div>
    </section>
  );
}

/**
 * Vùng 3: banner chỉ hiện khi có yêu cầu đang chờ. Lỗi “hết hạn” vẫn hiện sau khi tải lại làm banner biến mất.
 * Hết giờ đếm ngược thì tải lại chi tiết, web không tự hủy lịch (SA 6.6).
 */
export function CostConfirmationBanner({ appointment, pet }: { appointment: AppointmentDetail; pet: Pet | null }) {
  const { showSuccess } = useToast();
  const respond = useRespondCostConfirmation(appointment.appointmentId);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const pending = appointment.pendingCostConfirmation;
  const isPending = pending?.status === "Pending";
  const petName = appointment.petName ?? pet?.name ?? "bé";

  function accept() {
    if (!pending) return;
    const amount = formatMoney(pending.newAmount);
    respond.mutate(true, {
      onSuccess: () =>
        showSuccess(
          appointment.type === "Spa"
            ? `Đã đồng ý chi phí mới ${amount}. Nhân viên sẽ bắt đầu chăm sóc ${petName}.`
            : // Câu cho lịch lưu trú **(Đề xuất)**: ui-demo chỉ có câu của lịch spa.
              `Đã đồng ý chi phí mới ${amount}. Lễ tân sẽ tiếp tục thủ tục gửi ${petName}.`,
        ),
    });
  }

  function openRejectDialog() {
    respond.reset();
    setDialogOpen(true);
  }

  function reject() {
    respond.mutate(false, {
      onSuccess: () => {
        setDialogOpen(false);
        showSuccess(`Đã từ chối chi phí mới. Lịch ${formatAppointmentCode(appointment.appointmentId)} đã hủy.`);
      },
      // Hết hạn: đóng hộp thoại, báo ngay trên trang (banner tự ẩn sau khi tải lại). Lỗi khác hiện trong hộp thoại.
      onError: (error) => {
        if (isExpiredError(error)) setDialogOpen(false);
      },
    });
  }

  const error = respond.error;
  // Yêu cầu không còn chờ (vừa tải lại) thì hộp thoại cũng đóng.
  const showDialog = dialogOpen && isPending;
  const pageError = error && (!showDialog || isExpiredError(error)) ? error : null;
  const dialogError = error && showDialog && !isExpiredError(error) ? error : null;

  return (
    <>
      {pageError && (
        <ErrorAlert
          error={pageError}
          message={isExpiredError(pageError) ? EXPIRED_MESSAGE : undefined}
          className="mb-4"
        />
      )}
      {isPending && pending && (
        <Banner
          pending={pending}
          appointment={appointment}
          pet={pet}
          petName={petName}
          busy={respond.isPending}
          accepting={respond.isPending && respond.variables === true}
          onAccept={accept}
          onReject={openRejectDialog}
          onExpire={() =>
            void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointment.appointmentId), exact: true })
          }
        />
      )}
      {pending && (
        <RejectDialog
          open={showDialog}
          appointment={appointment}
          petName={petName}
          loading={respond.isPending && respond.variables === false}
          error={dialogError}
          onClose={() => setDialogOpen(false)}
          onConfirm={reject}
        />
      )}
    </>
  );
}
