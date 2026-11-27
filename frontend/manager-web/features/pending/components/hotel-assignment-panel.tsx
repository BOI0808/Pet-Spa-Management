"use client";

import { useEffect, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { toApiError } from "@/lib/api/errors";
import type { Appointment, Pet } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useConfirmHotelAppointment, useHotelSuggestions } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { getStayNights } from "../hotel-stay";
import { HotelCageSection } from "./hotel-cage-section";
import { HotelStaySummary } from "./hotel-stay-summary";
import { RejectAppointmentDialog } from "./reject-appointment-dialog";

type HotelAssignmentPanelProps = {
  appointment: Appointment;
  /** Hồ sơ thú cưng đã tải ở thẻ chi tiết; chưa có thì chưa tính được tiền tạm tính. */
  pet: Pet | undefined;
  /** Gọi sau khi lịch đã được xác nhận hoặc từ chối; màn hình lo gỡ lịch khỏi danh sách và chọn lịch kế tiếp. */
  onProcessed: (appointmentId: string) => void;
};

/**
 * MW-04 vùng 4, 8 và 6 cho lịch lưu trú: thông tin lịch, chuồng đề xuất, nút Từ chối và Xác nhận – UI-Screens.md (FR-HTL-05, FR-HTL-06).
 * Chỉ gửi `cageId` (chuồng đề xuất hoặc chuồng Quản lý chọn thay); số tiền, trạng thái, nhóm kích cỡ do backend quyết định (Frontend-Conventions 4.1).
 */
export function HotelAssignmentPanel({ appointment, pet, onProcessed }: HotelAssignmentPanelProps) {
  const { showSuccess, showError } = useToast();
  const suggestionQuery = useHotelSuggestions(appointment.appointmentId);
  const cagesQuery = useCages();
  const confirm = useConfirmHotelAppointment();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  // Chuồng Quản lý chọn thay chuồng đề xuất; `null` là dùng chuồng đề xuất. Panel được tạo lại cho mỗi lịch (`key` ở PendingDetailCard).
  const [chosenCageId, setChosenCageId] = useState<string | null>(null);

  const cage = suggestionQuery.data?.cage ?? null;
  const selectedCageId = chosenCageId ?? cage?.cageId ?? null;
  const selectedCode = cagesQuery.data?.items.find((item) => item.cageId === selectedCageId)?.code ?? cage?.code ?? "";
  const { plannedCheckIn, plannedCheckOut } = appointment;
  const nights = plannedCheckIn && plannedCheckOut ? getStayNights(plannedCheckIn, plannedCheckOut).length : 0;

  const resetConfirm = confirm.reset;
  useEffect(() => {
    resetConfirm();
  }, [appointment.appointmentId, cage?.cageId, resetConfirm]);

  function handleConfirm() {
    if (!selectedCageId) return;
    confirm.mutate(
      { appointmentId: appointment.appointmentId, cageId: selectedCageId },
      {
        onSuccess: () => {
          showSuccess(`Đã xác nhận ${formatAppointmentCode(appointment.appointmentId)}, gán chuồng ${selectedCode}`);
          onProcessed(appointment.appointmentId);
        },
        onError: (error) => {
          const { code } = toApiError(error);
          // Chuồng đã bị gán trong thời gian này: đề xuất được tải lại, quay về chuồng đề xuất mới thay vì giữ chuồng vừa bị trùng.
          if (code === "CAGE_CONFLICT") setChosenCageId(null);
          // Lịch không còn chờ: danh sách được tải lại và lịch biến mất cùng thông báo lỗi tại chỗ, nên báo bằng toast để người dùng kịp đọc.
          if (code === "INVALID_TRANSITION") showError(error);
        },
      },
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5 border-t border-line-soft p-5">
        <HotelStaySummary appointment={appointment} species={pet?.species} />
        <HotelCageSection
          query={suggestionQuery}
          nights={nights}
          cages={cagesQuery}
          selectedCageId={selectedCageId}
          onSelect={setChosenCageId}
        />
        <ErrorAlert error={confirm.error} />
      </div>

      <CardFooter>
        <Button variant="danger" disabled={confirm.isPending} onClick={() => setIsRejectOpen(true)}>
          <Icon name="x-circle" />
          Từ chối: cửa hàng không thể đáp ứng
        </Button>
        <Button
          variant="primary"
          className="ml-auto"
          disabled={!selectedCageId || suggestionQuery.isFetching}
          loading={confirm.isPending}
          onClick={handleConfirm}
        >
          Xác nhận lịch lưu trú
        </Button>
      </CardFooter>

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
