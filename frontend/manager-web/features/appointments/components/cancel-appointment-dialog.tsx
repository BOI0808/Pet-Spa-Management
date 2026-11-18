"use client";

import { useState } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { ChoiceCard } from "@/components/ui/choice-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toApiError } from "@/lib/api/errors";
import type { ManagerCancelReason } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { CANCEL_REASON_LABELS } from "@/lib/labels";
import { useCancelAppointment } from "@/lib/queries/appointments";

// Hai lý do Quản lý được chọn và câu hậu quả về hoàn tiền theo BR-24 (UI-Screens MW-05·D3).
const REASON_OPTIONS: readonly { value: ManagerCancelReason; refundNote: string }[] = [
  {
    value: "StoreUnable",
    refundNote: "Nếu đã có khoản Đã thanh toán, cửa hàng hoàn 100%, xử lý ngoài hệ thống.",
  },
  {
    value: "CustomerBeyondDeadline",
    refundNote: "Khoản đã thanh toán (nếu có) không hoàn lại.",
  },
];

const REASON_ERROR_ID = "cancel-reason-error";

type CancelAppointmentDialogProps = {
  appointmentId: string;
  onClose: () => void;
  /** Gọi sau khi backend đã hủy lịch; nơi gọi lo đóng hộp thoại. */
  onCancelled: () => void;
};

/**
 * MW-05·D3 Hủy lịch hẹn – UI-Screens.md (UC-15, FR-CHG-03; BR-24). Hành động khó hoàn tác nên bắt buộc qua hộp thoại xác nhận (SA 6.6).
 * Quản lý phải chọn một trong hai lý do; backend không nhận lý do nào khác từ Quản lý.
 */
export function CancelAppointmentDialog({ appointmentId, onClose, onCancelled }: CancelAppointmentDialogProps) {
  const { showSuccess, showError } = useToast();
  const cancel = useCancelAppointment();
  const [reason, setReason] = useState<ManagerCancelReason | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  function handleConfirm() {
    if (!reason) {
      setReasonError("Vui lòng chọn lý do hủy.");
      return;
    }

    cancel.mutate(
      { appointmentId, reason },
      {
        onSuccess: () => {
          showSuccess("Đã hủy lịch hẹn.");
          onCancelled();
        },
        // Lịch không còn hủy được (đã Hoàn tất hoặc đã hủy): chi tiết được tải lại và hộp thoại biến mất cùng nút Hủy, nên báo bằng toast.
        onError: (error) => {
          if (toApiError(error).code === "INVALID_TRANSITION") showError(error);
        },
      },
    );
  }

  return (
    <ConfirmDialog
      title="Hủy lịch hẹn"
      subtitle="Chọn lý do hủy. Lý do được ghi vào lịch hẹn."
      icon="x-circle"
      tone="danger"
      confirmLabel="Hủy lịch hẹn"
      loading={cancel.isPending}
      error={cancel.error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0" aria-describedby={reasonError ? REASON_ERROR_ID : undefined}>
        <legend className="sr-only">Lý do hủy lịch {formatAppointmentCode(appointmentId)}</legend>
        {REASON_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.value}
            showDot
            name="cancel-reason"
            value={option.value}
            checked={reason === option.value}
            disabled={cancel.isPending}
            onChange={() => {
              setReason(option.value);
              setReasonError(null);
            }}
          >
            <span className="min-w-0">
              <span className="block font-semibold">{CANCEL_REASON_LABELS[option.value]}</span>
              <span className="block text-xs text-muted">{option.refundNote}</span>
            </span>
          </ChoiceCard>
        ))}
        {reasonError && <FieldError id={REASON_ERROR_ID} message={reasonError} />}
      </fieldset>
    </ConfirmDialog>
  );
}
