"use client";

// MW-07 Chuồng và giá lưu trú – UI-Screens.md (UC-27, FR-HTL-01 → 03)
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import { useHotelPricing, useIsSavingHotelPricing } from "@/lib/queries/hotel-pricing";
import { HOTEL_PRICING_FORM_ID, HotelPricingForm } from "../components/hotel-pricing-form";

function PricingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-[1180px]:grid-cols-1">
      <Skeleton className="h-[520px] rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export function CagesScreen() {
  const pricing = useHotelPricing();
  const isSaving = useIsSavingHotelPricing();

  // Vùng 1 – Tiêu đề và nút chính; vùng 5, 6 – Bảng giá và phí trả muộn.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Chuồng và giá lưu trú</h1>
          <p className="mt-1 text-muted">Sức chứa lưu trú là số chuồng đang sử dụng.</p>
        </div>
        <Button
          type="submit"
          form={HOTEL_PRICING_FORM_ID}
          variant="primary"
          loading={isSaving}
          disabled={pricing.data === undefined}
        >
          Lưu bảng giá
        </Button>
      </div>

      {pricing.data !== undefined ? (
        <HotelPricingForm pricing={pricing.data} />
      ) : pricing.isError ? (
        isForbiddenError(pricing.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={pricing.error} className="w-full" />
            <Button onClick={() => void pricing.refetch()}>Thử lại</Button>
          </div>
        )
      ) : (
        <PricingSkeleton />
      )}
    </>
  );
}
