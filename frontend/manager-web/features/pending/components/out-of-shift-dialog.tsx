"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type OutOfShiftDialogProps = {
  /** `detail` của lỗi 409 STAFF_OUT_OF_SHIFT (nêu nhân viên ngoài ca); thiếu thì chỉ hiện câu hỏi. */
  detail: string | null;
  /** Đang gửi lại lệnh xác nhận kèm `confirmOutOfShift: true`. */
  loading: boolean;
  /** “Vẫn xác nhận”. */
  onConfirm: () => void;
  /** “Chọn lại”. */
  onClose: () => void;
};

/**
 * MW-04·D2 Nhân viên ngoài ca làm – UI-Screens.md (FR-ASG-03; SA 6.6, mã lỗi STAFF_OUT_OF_SHIFT, mục “Đề xuất” của SA 5.1.2).
 * Hiện khi xác nhận lịch spa bị 409 STAFF_OUT_OF_SHIFT; “Vẫn xác nhận” gửi lại cùng danh sách nhân viên kèm `confirmOutOfShift: true`.
 */
export function OutOfShiftDialog({ detail, loading, onConfirm, onClose }: OutOfShiftDialogProps) {
  return (
    <ConfirmDialog
      title="Nhân viên ngoài ca làm"
      icon="alert"
      tone="warn"
      confirmLabel="Vẫn xác nhận"
      cancelLabel="Chọn lại"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?</p>
      {detail && <p className="mt-2 text-muted">{detail}</p>}
    </ConfirmDialog>
  );
}
