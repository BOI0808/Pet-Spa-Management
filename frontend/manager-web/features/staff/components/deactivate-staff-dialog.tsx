"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StaffMember } from "@/lib/api/types";
import { useDeactivateStaff } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";

/**
 * MW-08·D2 Vô hiệu hóa tài khoản <tên>? – UI-Screens.md (FR-STF-03, BR-27). Hành động nguy hiểm nên bắt buộc qua hộp thoại xác nhận (SA 6.6).
 * Hai gạch đầu dòng cuối nói về lịch spa và lịch làm việc nên chỉ hiện với nhân viên spa (BR-27 chỉ áp dụng cho nhân viên spa).
 */
export function DeactivateStaffDialog({
  staff,
  onDeactivated,
  onClose,
}: {
  staff: StaffMember;
  onDeactivated?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const deactivate = useDeactivateStaff();

  function handleConfirm() {
    deactivate.mutate(staff.staffId, {
      onSuccess: ({ returnedToPending }) => {
        onDeactivated?.();
        onClose();
        if (returnedToPending > 0) {
          showSuccess(`Đã vô hiệu hóa ${staff.fullName}. ${returnedToPending} lịch đã về Chờ xác nhận.`);
          // Có lịch quay về Chờ xác nhận thì chuyển sang MW-04 để phân công lại (UI-Screens MW-08·D2).
          router.push(ROUTES.pending);
        } else {
          showSuccess(`Đã vô hiệu hóa ${staff.fullName}.`);
        }
      },
    });
  }

  return (
    <ConfirmDialog
      title={`Vô hiệu hóa tài khoản ${staff.fullName}?`}
      subtitle="Dùng khi nhân viên nghỉ việc."
      icon="ban"
      tone="danger"
      confirmLabel="Vô hiệu hóa"
      loading={deactivate.isPending}
      error={deactivate.error}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <ul className="list-disc space-y-1 pl-[18px]">
        <li>{staff.fullName} mất quyền đăng nhập ngay lập tức.</li>
        {staff.staffRole === "SpaStaff" && (
          <>
            <li>
              Các lịch spa Đã xác nhận đang phân công cho {staff.fullName} quay về Chờ xác nhận để bạn phân công lại.
              Khách hàng nhận thông báo.
            </li>
            <li>{staff.fullName} không còn xuất hiện trong danh sách đề xuất và lịch làm việc.</li>
          </>
        )}
      </ul>
    </ConfirmDialog>
  );
}
