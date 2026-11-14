"use client";

import { useEffect, useId } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, toApiError, type ApiError } from "@/lib/api/errors";
import type { SpaSuggestions } from "@/lib/api/types";
import { invalidatePending } from "@/lib/queries/appointments";
import { getCandidates } from "../spa-assignment";
import { StaffOption } from "./staff-option";

type SpaStaffSectionProps = {
  /** Kết quả `useSpaSuggestions` của lịch đang chọn. */
  query: UseQueryResult<SpaSuggestions, ApiError>;
  /** Nhân viên đang được chọn (đã xử lý bởi `resolveSelection`). */
  selectedIds: readonly string[];
  onToggle: (staffId: string) => void;
};

/**
 * MW-04 vùng 5 – chọn nhân viên spa phụ trách (UI-Screens.md, FR-ASG-01, FR-ASG-02).
 * Người trong `suggested` được chọn sẵn; Quản lý đổi sang người trong `alternatives` để điều chỉnh. Lịch cần 1 người dùng ô tròn,
 * cần 2 người dùng ô vuông và khóa các ô còn lại khi đã đủ.
 */
export function SpaStaffSection({ query, selectedIds, onToggle }: SpaStaffSectionProps) {
  const queryClient = useQueryClient();
  const groupName = useId();
  const suggestions = query.data;

  const isInvalidTransition = Boolean(query.error && toApiError(query.error).code === "INVALID_TRANSITION");

  useEffect(() => {
    if (isInvalidTransition) {
      void invalidatePending(queryClient);
    }
  }, [isInvalidTransition, queryClient]);

  function renderContent() {
    if (query.isPending) {
      return (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[66px] rounded-xl" />
          <Skeleton className="h-[66px] rounded-xl" />
        </div>
      );
    }

    if (query.isError) {
      if (isForbiddenError(query.error)) {
        return <ForbiddenState />;
      }
      if (isInvalidTransition) {
        return (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={query.error} className="w-full" />
            <Button onClick={() => void invalidatePending(queryClient)}>Tải lại danh sách</Button>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={query.error} className="w-full" />
          <Button onClick={() => void query.refetch()}>Thử lại</Button>
        </div>
      );
    }

    const { staffRequired, suggested } = query.data;
    const candidates = getCandidates(query.data);

    if (candidates.length < staffRequired) {
      // UC-12 / BR-03: không đủ nhân viên phù hợp thì Quản lý từ chối lịch (UC-13).
      return (
        <Alert>
          {candidates.length === 0
            ? "Không có nhân viên spa nào có ca làm phủ khung giờ và đang rảnh."
            : `Chỉ có ${candidates.length} nhân viên spa phù hợp, trong khi lịch này cần ${staffRequired} người.`}{" "}
          Bạn có thể từ chối lịch hẹn này vì cửa hàng không thể đáp ứng.
        </Alert>
      );
    }

    const suggestedIds = new Set(suggested.map((staff) => staff.staffId));
    const mode = staffRequired === 1 ? "radio" : "checkbox";
    const isFull = selectedIds.length >= staffRequired;

    return (
      <>
        <p className="mb-3 text-xs text-muted">
          Hệ thống đề xuất theo thứ tự: có ca làm phủ khung giờ, đang rảnh, ít lịch nhất trong 30 ngày qua. Bạn có thể đổi người khác.
        </p>
        <div role={mode === "radio" ? "radiogroup" : "group"} aria-label="Nhân viên spa phụ trách" className="flex flex-col gap-2.5">
          {candidates.map((staff) => {
            const checked = selectedIds.includes(staff.staffId);
            return (
              <StaffOption
                key={staff.staffId}
                staff={staff}
                mode={mode}
                name={groupName}
                checked={checked}
                suggested={suggestedIds.has(staff.staffId)}
                disabled={mode === "checkbox" && isFull && !checked}
                onChange={() => onToggle(staff.staffId)}
              />
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3>{suggestions ? `Nhân viên spa phụ trách, cần ${suggestions.staffRequired} người` : "Nhân viên spa phụ trách"}</h3>
        {suggestions && (
          <span className="text-xs text-muted" aria-live="polite">
            Đã chọn {selectedIds.length} / {suggestions.staffRequired}
          </span>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
