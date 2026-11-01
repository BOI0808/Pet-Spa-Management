"use client";

import { useToast } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Service } from "@/lib/api/types";
import { useSetServiceStatus } from "@/lib/queries/services";

/** MW-06·D2 Ngừng cung cấp dịch vụ này? – UI-Screens.md (FR-SVC-03). Hành động nguy hiểm nên bắt buộc qua hộp thoại xác nhận (SA 6.6). */
export function StopServiceDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const { showSuccess } = useToast();
  const setStatus = useSetServiceStatus();

  function handleConfirm() {
    setStatus.mutate(
      { serviceId: service.serviceId, isActive: false },
      {
        onSuccess: () => {
          showSuccess("Đã ngừng cung cấp dịch vụ");
          onClose();
        },
      },
    );
  }

  return (
    <ConfirmDialog
      title="Ngừng cung cấp dịch vụ này?"
      subtitle="Bạn có thể mở lại bất cứ lúc nào."
      icon="ban"
      confirmLabel="Ngừng cung cấp"
      loading={setStatus.isPending}
      error={setStatus.error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <p>Dịch vụ sẽ không còn hiển thị khi khách hàng và lễ tân đặt lịch mới.</p>
    </ConfirmDialog>
  );
}
