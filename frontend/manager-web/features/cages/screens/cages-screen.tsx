"use client";

// MW-07 Chuồng và giá lưu trú – UI-Screens.md (UC-27, FR-HTL-01 → 03)
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Cage } from "@/lib/api/types";
import { useHotelPricing, useIsSavingHotelPricing } from "@/lib/queries/hotel-pricing";
import { ROUTES } from "@/lib/routes";
import { CageFormDialog } from "../components/cage-form-dialog";
import { CagesTab } from "../components/cages-tab";
import { HOTEL_PRICING_FORM_ID, HotelPricingForm } from "../components/hotel-pricing-form";

type Tab = "cages" | "pricing";

const TAB_HREF: Record<Tab, string> = {
  cages: ROUTES.cages,
  pricing: `${ROUTES.cages}?tab=pricing`,
};

/** `?tab=pricing` mở tab Giá; thiếu hoặc sai giá trị thì mở tab Chuồng. */
function parseTab(value: string | null): Tab {
  return value === "pricing" ? "pricing" : "cages";
}

/** Đang mở hộp thoại thêm (`"new"`) hoặc sửa một chuồng; `null` là đóng. */
type DialogState = "new" | Cage | null;

// `.tabs button` của ui-demo: chữ 500, tab đang chọn chữ 600 và gạch chân Lagoon.
function tabClass(isActive: boolean) {
  return `-mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-sm ${
    isActive ? "border-lagoon font-semibold text-lagoon-700" : "border-transparent font-medium text-muted hover:text-ink"
  }`;
}

function PricingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 max-[1180px]:grid-cols-1">
      <Skeleton className="h-[520px] rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export function CagesScreen() {
  const tab = parseTab(useSearchParams().get("tab"));
  const [cages, setCages] = useState<Cage[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const pricing = useHotelPricing();
  const isSavingPricing = useIsSavingHotelPricing();

  // Thêm chuồng mới vào cuối danh sách phiên, hoặc thay chuồng đã có (sau khi sửa / đổi trạng thái).
  function upsertCage(saved: Cage) {
    setCages((current) =>
      current.some((cage) => cage.cageId === saved.cageId)
        ? current.map((cage) => (cage.cageId === saved.cageId ? saved : cage))
        : [...current, saved],
    );
  }

  // Vùng 1 – Tiêu đề và nút chính theo tab; vùng 2 – Tab; vùng 4 – Bảng chuồng; vùng 5, 6 – Bảng giá và phí trả muộn.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Chuồng và giá lưu trú</h1>
          <p className="mt-1 text-muted">Sức chứa lưu trú là số chuồng đang sử dụng.</p>
        </div>
        {tab === "cages" ? (
          <Button variant="primary" onClick={() => setDialog("new")}>
            <Icon name="plus" />
            Thêm chuồng
          </Button>
        ) : (
          <Button
            type="submit"
            form={HOTEL_PRICING_FORM_ID}
            variant="primary"
            loading={isSavingPricing}
            disabled={pricing.data === undefined}
          >
            Lưu bảng giá
          </Button>
        )}
      </div>

      <nav aria-label="Chuồng và giá lưu trú" className="mb-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        <Link href={TAB_HREF.cages} aria-current={tab === "cages" ? "page" : undefined} className={tabClass(tab === "cages")}>
          <Icon name="grid" />
          Chuồng
        </Link>
        <Link
          href={TAB_HREF.pricing}
          aria-current={tab === "pricing" ? "page" : undefined}
          className={tabClass(tab === "pricing")}
        >
          <Icon name="list" />
          Giá lưu trú và phí trả muộn
        </Link>
      </nav>

      {/* Cả hai tab luôn được dựng, tab không chọn chỉ bị ẩn: đổi tab không làm mất danh sách chuồng hay giá đang nhập dở,
          và thao tác đang gửi vẫn kịp cập nhật giao diện và báo toast khi xong. */}
      <div hidden={tab !== "cages"}>
        <CagesTab cages={cages} onAdd={() => setDialog("new")} onEdit={setDialog} onChanged={upsertCage} />
      </div>
      <div hidden={tab !== "pricing"}>
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
      </div>

      {dialog !== null && (
        <CageFormDialog cage={dialog === "new" ? null : dialog} onClose={() => setDialog(null)} onSaved={upsertCage} />
      )}
    </>
  );
}
