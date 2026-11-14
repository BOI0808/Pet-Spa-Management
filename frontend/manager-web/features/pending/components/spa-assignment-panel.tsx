"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { toApiError } from "@/lib/api/errors";
import type { Appointment, Pet } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useConfirmSpaAppointment, useSpaSuggestions } from "@/lib/queries/appointments";
import { getCandidates, resolveSelection, toggleStaff } from "../spa-assignment";
import { OutOfShiftDialog } from "./out-of-shift-dialog";
import { RejectAppointmentDialog } from "./reject-appointment-dialog";
import { SpaAppointmentSummary } from "./spa-appointment-summary";
import { SpaStaffSection } from "./spa-staff-section";

type SpaAssignmentPanelProps = {
  appointment: Appointment;
  /** Hồ sơ thú cưng đã tải ở thẻ chi tiết; chưa có thì chưa tính được tiền tạm tính. */
  pet: Pet | undefined;
  /** Gọi sau khi lịch đã được xác nhận hoặc từ chối; màn hình lo gỡ lịch khỏi danh sách và chọn lịch kế tiếp. */
  onProcessed: (appointmentId: string) => void;
};

/**
 * MW-04 vùng 4, 5 và 6 cho lịch spa: thông tin lịch, nhân viên phụ trách, nút Từ chối và Xác nhận – UI-Screens.md (FR-ASG-01 → 04).
 * Chỉ gửi `staffIds` (và `confirmOutOfShift` sau khi Quản lý đồng ý ở MW-04·D2); trạng thái, số tiền do backend quyết định (Frontend-Conventions 4.1).
 */
export function SpaAssignmentPanel({ appointment, pet, onProcessed }: SpaAssignmentPanelProps) {
  const { showSuccess, showError } = useToast();
  const suggestionQuery = useSpaSuggestions(appointment.appointmentId);
  const confirm = useConfirmSpaAppointment();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  // `null` = chưa chọn tay, dùng những người được đề xuất. Panel được dựng lại (key) khi đổi lịch nên không cần đặt lại theo lịch.
  const [manualIds, setManualIds] = useState<string[] | null>(null);
  // Có giá trị khi backend báo 409 STAFF_OUT_OF_SHIFT: mở MW-04·D2 và giữ lại `detail` của lỗi (lỗi trong `confirm` bị xóa khi gửi lại).
  const [outOfShift, setOutOfShift] = useState<{ detail: string | null } | null>(null);

  const suggestions = suggestionQuery.data;
  const selectedIds = suggestions ? resolveSelection(suggestions, manualIds) : [];
  const hasEnoughStaff = suggestions !== undefined && selectedIds.length === suggestions.staffRequired;
  const canConfirm = hasEnoughStaff && !suggestionQuery.isFetching;
  // Lỗi ngoài ca đã có hộp thoại riêng nên không lặp lại trong thân thẻ.
  const confirmError = confirm.error && toApiError(confirm.error).code === "STAFF_OUT_OF_SHIFT" ? null : confirm.error;

  function handleToggle(staffId: string) {
    if (!suggestions) return;
    confirm.reset();
    setManualIds(toggleStaff(selectedIds, staffId, suggestions.staffRequired));
  }

  function submitConfirm(confirmOutOfShift: boolean) {
    if (!suggestions || !hasEnoughStaff) return;
    const staffNames = getCandidates(suggestions)
      .filter((staff) => selectedIds.includes(staff.staffId))
      .map((staff) => staff.fullName)
      .join(", ");
    const request = {
      appointmentId: appointment.appointmentId,
      staffIds: selectedIds,
      ...(confirmOutOfShift ? { confirmOutOfShift: true as const } : {}),
    };

    confirm.mutate(request, {
      onSuccess: () => {
        setOutOfShift(null);
        showSuccess(`Đã xác nhận ${formatAppointmentCode(appointment.appointmentId)}, phân công ${staffNames}. Khách và nhân viên đã được thông báo.`);
        onProcessed(appointment.appointmentId);
      },
      onError: (error) => {
        const apiError = toApiError(error);
        const code = apiError.code;
        // Người ngoài ca: hỏi lại Quản lý (MW-04·D2). Gửi lại kèm `confirmOutOfShift` mà vẫn lỗi thì đóng hộp thoại, lỗi hiện ở thân thẻ.
        setOutOfShift(code === "STAFF_OUT_OF_SHIFT" && !confirmOutOfShift ? { detail: apiError.detail } : null);
        // Danh sách đề xuất đã được tải lại (lỗi 409): bỏ lựa chọn tay để dùng lại người được đề xuất mới.
        if (code === "STAFF_CONFLICT" || code === "STAFF_COUNT_MISMATCH") setManualIds(null);
        // Lịch không còn chờ: danh sách được tải lại và lịch biến mất cùng thông báo lỗi tại chỗ, nên báo bằng toast để người dùng kịp đọc.
        if (code === "INVALID_TRANSITION") showError(error);
      },
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5 border-t border-line-soft p-5">
        <SpaAppointmentSummary appointment={appointment} pet={pet} />
        <SpaStaffSection query={suggestionQuery} selectedIds={selectedIds} onToggle={handleToggle} />
        <ErrorAlert error={confirmError} />
      </div>

      <CardFooter>
        <Button variant="danger" disabled={confirm.isPending} onClick={() => setIsRejectOpen(true)}>
          <Icon name="x-circle" />
          Từ chối: cửa hàng không thể đáp ứng
        </Button>
        <Button variant="primary" className="ml-auto" disabled={!canConfirm} loading={confirm.isPending} onClick={() => submitConfirm(false)}>
          Xác nhận lịch hẹn
        </Button>
      </CardFooter>

      {outOfShift && (
        <OutOfShiftDialog
          detail={outOfShift.detail}
          loading={confirm.isPending}
          onConfirm={() => submitConfirm(true)}
          onClose={() => setOutOfShift(null)}
        />
      )}

      {isRejectOpen && (
        <RejectAppointmentDialog
          appointmentId={appointment.appointmentId}
          onClose={() => setIsRejectOpen(false)}
          onRejected={() => {
            setIsRejectOpen(false);
            onProcessed(appointment.appointmentId);
          }}
        />
      )}
    </>
  );
}
