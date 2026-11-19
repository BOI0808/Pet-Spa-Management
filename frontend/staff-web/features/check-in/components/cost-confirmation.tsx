"use client";

// SW-07 vùng 7 “Cần khách xác nhận” và hộp thoại SW-07·D1 “Ghi nhận phản hồi của khách” – UI-Screens.md, FR-EXE-11,
// BR-23, UF-10. Dùng chung cho thẻ tiếp nhận spa và lưu trú.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Countdown, useCountdown } from "@/components/feedback/countdown";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Modal } from "@/components/ui/modal";
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, CostConfirmation, CostConfirmationRespondResult } from "@/lib/api/types";
import { formatAppointmentCode, formatMoney, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";
import { appointmentKeys, useRespondCostConfirmation } from "@/lib/queries/appointments";
import { toStoreTime } from "@/lib/time";

/** Cùng câu với customer-web (cost-confirmation-banner.tsx), thêm hậu quả lễ tân cần biết. */
const EXPIRED_MESSAGE = "Yêu cầu xác nhận chi phí đã hết hạn. Lịch hẹn đã bị hủy.";

/** 409 `COST_CONFIRMATION_EXPIRED`: backend vừa hủy lịch; 404: yêu cầu không còn (đã có người phản hồi, đã hết hạn). */
function isExpiredError(error: ApiError) {
  return error.code === "COST_CONFIRMATION_EXPIRED" || error.status === 404;
}

/** “Chênh 2,2 kg” – làm tròn 2 chữ số để tránh số lẻ của phép trừ số thực. */
export function weightDifference(actualWeightKg: number, declaredWeightKg: number | null) {
  if (declaredWeightKg === null) return null;
  return formatWeight(Math.round(Math.abs(actualWeightKg - declaredWeightKg) * 100) / 100);
}

/**
 * Yêu cầu xác nhận chi phí đang chờ của lịch và đã quá hạn hay chưa. Đồng hồ về 0 thì tải lại chi tiết lịch
 * (UI-Screens SW-07 “đếm ngược hết giờ → tải lại lịch”); web không tự đổi trạng thái lịch (SA 6.6).
 */
export function usePendingCostConfirmation(appointment: AppointmentDetail) {
  const queryClient = useQueryClient();
  const pending =
    appointment.pendingCostConfirmation?.status === "Pending" ? appointment.pendingCostConfirmation : null;
  const secondsLeft = useCountdown(pending?.expiresAt ?? "", () => {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointment.appointmentId) });
  });
  return { pending, overdue: pending !== null && secondsLeft === 0 };
}

type CostConfirmationAlertProps = {
  appointment: AppointmentDetail;
  pending: CostConfirmation;
  /** Cân nặng trong hồ sơ; khi đang chờ xác nhận hồ sơ chưa đổi nên đây vẫn là cân khai báo. */
  declaredWeightKg: number | null;
  /** Đồng hồ đã về 0 (`usePendingCostConfirmation`, để nút ở chân thẻ và hộp thoại cùng biết). */
  overdue: boolean;
};

/**
 * Vùng 7 (và vùng 9 của lịch lưu trú khi đang chờ): cảnh báo tăng nhóm, đồng hồ đếm ngược, chú thích hậu quả.
 * Dữ liệu lấy từ `pendingCostConfirmation` của chi tiết lịch, nên giống nhau dù vừa tiếp nhận hay mở lại lịch đang chờ.
 */
export function CostConfirmationAlert({ appointment, pending, declaredWeightKg, overdue }: CostConfirmationAlertProps) {
  const oldGroup = SIZE_GROUP_LABELS[appointment.sizeGroup];
  const newGroup = SIZE_GROUP_LABELS[pending.newSizeGroup];
  const weight = formatWeight(pending.actualWeightKg);
  const difference = weightDifference(pending.actualWeightKg, declaredWeightKg);

  if (overdue) {
    // Tác vụ tự hủy sau 30 phút là thẻ backend 98 (chưa có): lịch còn ở trạng thái cũ cho tới khi có người phản hồi;
    // lúc đó backend trả 409 COST_CONFIRMATION_EXPIRED và hủy lịch.
    return (
      <Alert tone="danger" icon="timer" title="Đã quá hạn phản hồi chi phí mới">
        Khách chưa xác nhận chi phí mới {formatMoney(pending.newAmount)} trước {toStoreTime(pending.expiresAt)}. Lịch
        sẽ bị hủy với lý do không xác nhận chi phí mới.
      </Alert>
    );
  }

  return (
    <Alert tone="warn" icon="scale" title={`Tăng nhóm kích cỡ: ${oldGroup} → ${newGroup}`}>
      Cân thực tế {weight}
      {difference && ` (chênh ${difference})`}, vượt ngưỡng dung sai so với hồ sơ. Chi phí tăng từ{" "}
      {formatMoney(pending.oldAmount)} lên <b>{formatMoney(pending.newAmount)}</b>. Đã gửi yêu cầu xác nhận cho khách,
      hạn phản hồi {toStoreTime(pending.expiresAt)}{" "}
      <Countdown expiresAt={pending.expiresAt} />
      <div className="mt-1 text-xs text-muted">
        Khách đồng ý thì lịch tiếp tục và hồ sơ cập nhật {weight}. Khách từ chối hoặc quá hạn, lịch tự động hủy. Khách
        vãng lai hoặc khách trả lời trực tiếp: bấm “Ghi nhận phản hồi của khách”.
      </div>
    </Alert>
  );
}

type RecordResponseDialogProps = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentDetail;
  pending: CostConfirmation;
  petName: string;
  overdue: boolean;
  /** Ghi nhận thành công; lịch lưu trú dùng `result.cageSuitable` để báo chuồng không còn phù hợp. */
  onResponded?: (accept: boolean, result: CostConfirmationRespondResult) => void;
};

type Choice = "accept" | "reject";

/**
 * SW-07·D1. Nhóm “Khách phản hồi qua” của ui-demo không có trường trong API nên không làm (G-20).
 * Không chọn sẵn lựa chọn nào để lễ tân không lỡ tay ghi “đồng ý”; quá hạn chỉ còn “Khách từ chối” (Đề xuất).
 */
export function RecordResponseDialog({
  open,
  onClose,
  appointment,
  pending,
  petName,
  overdue,
  onResponded,
}: RecordResponseDialogProps) {
  const { showSuccess, showError } = useToast();
  const respond = useRespondCostConfirmation(appointment.appointmentId);
  const [choice, setChoice] = useState<Choice | null>(null);
  const code = formatAppointmentCode(appointment.appointmentId);
  // Hết hạn ngay khi hộp thoại đang mở: bỏ lựa chọn “đồng ý” đã chọn.
  const selected = overdue && choice === "accept" ? null : choice;

  function close() {
    setChoice(null);
    respond.reset();
    onClose();
  }

  function submit() {
    if (!selected) return;
    const accept = selected === "accept";
    respond.mutate(accept, {
      onSuccess: (result) => {
        onResponded?.(accept, result);
        showSuccess(
          accept
            ? `Đã ghi nhận khách đồng ý chi phí mới cho ${petName}`
            : `Đã ghi nhận khách từ chối, lịch ${code} đã hủy`,
        );
        close();
      },
      onError: (error) => {
        // Hết hạn: hook đã tải lại lịch (giờ là Đã hủy), đóng hộp thoại và báo bằng toast; lỗi khác hiện trong hộp thoại.
        if (isExpiredError(error)) {
          showError(EXPIRED_MESSAGE);
          close();
        }
      },
    });
  }

  const shownError = respond.error && !isExpiredError(respond.error) ? respond.error : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Ghi nhận phản hồi của khách"
      description={`${petName}, ${code}. Chi phí mới ${formatMoney(pending.newAmount)} (trước ${formatMoney(pending.oldAmount)}).`}
      icon="phone"
      tone="warn"
      busy={respond.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={respond.isPending}>
            Hủy bỏ
          </Button>
          <Button
            variant={selected === "reject" ? "danger-solid" : "primary"}
            disabled={!selected}
            loading={respond.isPending}
            onClick={submit}
          >
            Ghi nhận phản hồi
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Phản hồi của khách</legend>
        {!overdue && (
          <ChoiceCard
            name="cost-response"
            value="accept"
            checked={selected === "accept"}
            onChange={() => setChoice("accept")}
            showDot
          >
            <div className="min-w-0">
              <div className="font-semibold">Khách đồng ý chi phí mới</div>
              <div className="text-xs text-muted">Lịch tiếp tục, hồ sơ cập nhật {formatWeight(pending.actualWeightKg)}</div>
            </div>
          </ChoiceCard>
        )}
        <ChoiceCard
          name="cost-response"
          value="reject"
          checked={selected === "reject"}
          onChange={() => setChoice("reject")}
          showDot
        >
          <div className="min-w-0">
            <div className="font-semibold">Khách từ chối</div>
            <div className="text-xs text-muted">Lịch bị hủy, lý do không xác nhận chi phí mới</div>
          </div>
        </ChoiceCard>
      </fieldset>
      {overdue && (
        <p className="mt-3 text-xs text-muted">
          Đã quá hạn phản hồi nên không ghi nhận đồng ý được nữa.
        </p>
      )}
      {shownError && <ErrorAlert error={shownError} className="mt-3" />}
    </Modal>
  );
}
