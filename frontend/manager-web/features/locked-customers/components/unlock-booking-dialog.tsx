"use client";

import { useToast } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { useUnlockCustomerBooking } from "@/lib/queries/customers";

const CUSTOMER_NOT_LOCKED = "CUSTOMER_NOT_LOCKED";

type UnlockBookingDialogProps = {
  customer: Customer;
  onClose: () => void;
};

/**
 * MW-09·D1 Gỡ khóa tự đặt lịch? – UI-Screens.md (FR-BOOK-07, BR-15). Thành công: toast, tải lại danh sách, đóng hộp thoại.
 * 409 CUSTOMER_NOT_LOCKED (khách đã được gỡ khóa ở nơi khác) hoặc 404: danh sách được tải lại nên dòng này biến mất cùng hộp thoại,
 * vì vậy báo lỗi bằng toast rồi đóng; lỗi khác hiện ngay trong hộp thoại để thử lại.
 */
export function UnlockBookingDialog({ customer, onClose }: UnlockBookingDialogProps) {
  const { showSuccess, showError } = useToast();
  const unlock = useUnlockCustomerBooking();

  function handleConfirm() {
    unlock.mutate(customer.customerId, {
      onSuccess: () => {
        showSuccess("Đã gỡ khóa tự đặt lịch");
        onClose();
      },
      onError: (error) => {
        const apiError = toApiError(error);
        if (apiError.code === CUSTOMER_NOT_LOCKED || apiError.status === 404) {
          showError(error);
          onClose();
        }
      },
    });
  }

  return (
    <ConfirmDialog
      title="Gỡ khóa tự đặt lịch?"
      subtitle="Khách đã liên hệ cửa hàng qua hotline."
      icon="unlock"
      tone="teal"
      confirmLabel="Gỡ khóa"
      loading={unlock.isPending}
      error={unlock.error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <p>Khách có thể tự đặt lịch trực tuyến trở lại ngay sau khi gỡ khóa.</p>
    </ConfirmDialog>
  );
}
