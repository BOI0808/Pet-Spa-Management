"use client";

import { useToast } from "@/components/feedback/toast";
import { StatusBadge } from "@/components/domain/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toApiError } from "@/lib/api/errors";
import { useRejectAppointment } from "@/lib/queries/appointments";

type RejectAppointmentDialogProps = {
  appointmentId: string;
  onClose: () => void;
  /** Gọi sau khi backend đã từ chối lịch; nơi gọi lo đóng hộp thoại và chuyển sang lịch kế tiếp. */
  onRejected: () => void;
};

/**
 * MW-04·D1 Từ chối lịch hẹn này? – UI-Screens.md (UC-13, FR-HTL-06). Hành động khó hoàn tác nên bắt buộc qua hộp thoại xác nhận (SA 6.6).
 * Không gửi lý do: backend tự đặt StoreUnable. Dùng chung cho lịch lưu trú (thẻ 145) và lịch spa (thẻ 144).
 */
export function RejectAppointmentDialog({ appointmentId, onClose, onRejected }: RejectAppointmentDialogProps) {
  const { showSuccess, showError } = useToast();
  const reject = useRejectAppointment();

  function handleConfirm() {
    reject.mutate(appointmentId, {
      onSuccess: () => {
        showSuccess("Đã từ chối lịch hẹn. Khách đã được thông báo.");
        onRejected();
      },
      // Lịch không còn chờ: danh sách được tải lại và lịch biến mất cùng hộp thoại, nên báo bằng toast để người dùng kịp đọc.
      onError: (error) => {
        if (toApiError(error).code === "INVALID_TRANSITION") showError(error);
      },
    });
  }

  return (
    <ConfirmDialog
      title="Từ chối lịch hẹn này?"
      subtitle="Dùng khi cửa hàng không có nhân viên hoặc chuồng phù hợp."
      icon="x-circle"
      tone="danger"
      confirmLabel="Từ chối lịch hẹn"
      loading={reject.isPending}
      error={reject.error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <p>
        Lịch chuyển sang <StatusBadge status="Cancelled" /> với lý do cửa hàng không thể đáp ứng. Khách có tài khoản nhận thông báo
        kèm lý do; khách vãng lai được lễ tân gọi báo.
      </p>
    </ConfirmDialog>
  );
}
