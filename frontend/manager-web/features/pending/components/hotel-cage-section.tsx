"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError, type ApiError } from "@/lib/api/errors";
import type { HotelSuggestions } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { SuggestedTag } from "./suggested-tag";

type HotelCageSectionProps = {
  /** Kết quả `useHotelSuggestions` của lịch đang chọn. */
  query: UseQueryResult<HotelSuggestions, ApiError>;
  /** Số đêm của lịch, để nêu đúng điều kiện “trống trong cả n đêm”. */
  nights: number;
};

/**
 * MW-04 vùng 8 – chọn chuồng cho lịch lưu trú (UI-Screens.md, FR-HTL-05).
 * Chỉ hiện chuồng hệ thống đề xuất: chuồng khác cùng loài, nhóm cần `GET /cages` (backend thẻ 88, web thẻ 150) nên chưa làm (UI-Screens G-08).
 * Gặp 409 CAGE_CONFLICT khi xác nhận thì đề xuất được tải lại và có thể đổi sang chuồng khác.
 */
export function HotelCageSection({ query, nights }: HotelCageSectionProps) {
  const cage = query.data?.cage ?? null;
  const nightsText = nights > 0 ? `cả ${nights} đêm` : "toàn bộ các đêm";

  function renderContent() {
    if (query.isPending) return <Skeleton className="h-[66px] rounded-xl" />;

    if (query.isError) {
      return isForbiddenError(query.error) ? (
        <ForbiddenState />
      ) : (
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

    return (
      <>
        <p className="mb-3 text-xs text-muted">
          Chuồng phù hợp {SPECIES_LABELS[cage.species].toLocaleLowerCase("vi-VN")} nhóm {SIZE_GROUP_LABELS[cage.sizeGroup]}, trống
          trong {nightsText}.
        </p>
        <div className="grid grid-cols-2 gap-2.5 max-[640px]:grid-cols-1">
          {/* Một chuồng duy nhất nên luôn được chọn; khi có danh sách chuồng (thẻ 150) thì thêm ô radio cho từng chuồng. */}
          <ChoiceCard showDot name="cage" value={cage.cageId} checked readOnly>
            <div className="min-w-0 grow">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{cage.code}</span>
                <SuggestedTag />
              </div>
              <div className="text-xs text-muted">
                {SPECIES_LABELS[cage.species]}, nhóm {SIZE_GROUP_LABELS[cage.sizeGroup]}. Trống {nightsText}
              </div>
            </div>
          </ChoiceCard>
        </div>
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
