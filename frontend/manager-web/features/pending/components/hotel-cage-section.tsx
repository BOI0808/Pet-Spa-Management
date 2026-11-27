"use client";

import { useEffect } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, toApiError, type ApiError } from "@/lib/api/errors";
import type { Cage, HotelSuggestions, Page } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { invalidatePending } from "@/lib/queries/appointments";
import { getStoreToday } from "@/lib/time";
import { formatOccupantCheckOut } from "@/features/cages/cage-status";
import { SuggestedTag } from "./suggested-tag";

type HotelCageSectionProps = {
  /** Kết quả `useHotelSuggestions` của lịch đang chọn. */
  query: UseQueryResult<HotelSuggestions, ApiError>;
  /** Số đêm của lịch, để nêu đúng điều kiện “trống trong cả n đêm”. */
  nights: number;
  /** Kết quả `useCages`, nguồn các chuồng khác cùng loài, nhóm để chọn thay chuồng đề xuất. */
  cages: UseQueryResult<Page<Cage>, ApiError>;
  /** Chuồng đang chọn; `null` khi chưa có chuồng nào (không còn chuồng phù hợp). */
  selectedCageId: string | null;
  onSelect: (cageId: string) => void;
};

/**
 * MW-04 vùng 8 – chọn chuồng cho lịch lưu trú (UI-Screens.md, FR-HTL-05).
 * Chuồng hệ thống đề xuất được chọn sẵn; chuồng đang sử dụng khác cùng loài, nhóm (từ `GET /cages`) chọn được thay thế, chuồng khác loài, nhóm hiện mờ.
 * Chuồng khác có trống trong cả các đêm hay không do backend kiểm tra khi xác nhận (UI-Screens G-08): trùng thì 409 CAGE_CONFLICT,
 * đề xuất được tải lại và quay về chuồng đề xuất. Chưa tải được `GET /cages` thì vẫn chọn được chuồng đề xuất.
 */
export function HotelCageSection({ query, nights, cages, selectedCageId, onSelect }: HotelCageSectionProps) {
  const queryClient = useQueryClient();
  const cage = query.data?.cage ?? null;
  const nightsText = nights > 0 ? `cả ${nights} đêm` : "toàn bộ các đêm";

  const isInvalidTransition = Boolean(query.error && toApiError(query.error).code === "INVALID_TRANSITION");

  useEffect(() => {
    if (isInvalidTransition) {
      void invalidatePending(queryClient);
    }
  }, [isInvalidTransition, queryClient]);

  function renderContent() {
    if (query.isPending) return <Skeleton className="h-[66px] rounded-xl" />;

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

    if (!cage) {
      // UC-29: không còn chuồng phù hợp thì Quản lý từ chối lịch (UC-13).
      return (
        <Alert>
          Không còn chuồng phù hợp trống trong {nightsText}. Bạn có thể từ chối lịch hẹn này vì cửa hàng không thể đáp ứng.
        </Alert>
      );
    }

    // Chưa có danh sách chuồng (đang tải, lỗi, hoặc chuồng đề xuất nằm ngoài trang đã tải) thì chỉ còn chuồng đề xuất.
    const activeCages = cages.data?.items.filter((item) => item.isActive) ?? [];
    const fits = (item: Cage) => item.species === cage.species && item.sizeGroup === cage.sizeGroup;
    const allOptions = activeCages.some((item) => item.cageId === cage.cageId) ? activeCages : [cage];
    // Chuồng chọn được lên trước, chuồng khác loài, nhóm (mờ) xuống sau; trong mỗi nhóm giữ thứ tự mã chuồng backend trả.
    const options = [...allOptions.filter(fits), ...allOptions.filter((item) => !fits(item))];
    const hasAlternative = options.some((item) => item.cageId !== cage.cageId && fits(item));
    const today = getStoreToday();

    function describe(item: Cage) {
      const kind = `${SPECIES_LABELS[item.species]}, nhóm ${SIZE_GROUP_LABELS[item.sizeGroup]}`;
      if (item.cageId === cage?.cageId) return `${kind}. Trống ${nightsText}`;
      if (!fits(item)) return `${kind}. Không phù hợp kích cỡ`;
      if (item.occupant) return `${kind}. Đang chứa ${item.occupant.petName}, ${formatOccupantCheckOut(item.occupant.plannedCheckOut, today).toLocaleLowerCase("vi-VN")}`;
      return kind;
    }

    return (
      <>
        <p className="mb-3 text-xs text-muted">
          Chuồng phù hợp {SPECIES_LABELS[cage.species].toLocaleLowerCase("vi-VN")} nhóm {SIZE_GROUP_LABELS[cage.sizeGroup]}, trống
          trong {nightsText}.{hasAlternative ? " Bạn có thể chọn chuồng khác phù hợp." : ""}
        </p>
        <div className="grid grid-cols-2 gap-2.5 max-[640px]:grid-cols-1">
          {options.map((item) =>
            fits(item) ? (
              <ChoiceCard
                key={item.cageId}
                showDot
                name="cage"
                value={item.cageId}
                checked={item.cageId === selectedCageId}
                onChange={() => onSelect(item.cageId)}
              >
                <div className="min-w-0 grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">{item.code}</span>
                    {item.cageId === cage.cageId && <SuggestedTag />}
                  </div>
                  <div className="break-words text-xs text-muted">{describe(item)}</div>
                </div>
              </ChoiceCard>
            ) : (
              // Chuồng khác loài, nhóm: chỉ để tham khảo, không chọn được.
              <div key={item.cageId} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 opacity-50">
                <div className="min-w-0 grow">
                  <span className="text-base font-semibold">{item.code}</span>
                  <div className="break-words text-xs text-muted">{describe(item)}</div>
                </div>
              </div>
            ),
          )}
        </div>
        {cages.isError && <ErrorAlert error={cages.error} className="mt-3" />}
      </>
    );
  }

  return (
    <div>
      <h3 className="mb-2">Chuồng</h3>
      {renderContent()}
    </div>
  );
}
