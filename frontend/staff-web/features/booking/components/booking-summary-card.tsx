import type { ReactNode } from "react";
import { PetLine } from "@/components/domain/pet-line";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import type { Pet } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

type BookingSummaryCardProps = {
  pet: Pet | null;
  /** Phần riêng của từng tab (dịch vụ + thời gian hoặc nhận/trả + số đêm). */
  children: ReactNode;
  /** Nút tạo lịch, lý do bị khóa, lỗi kiểm tra. */
  footer: ReactNode;
};

/** SW-06 vùng 7 – “Tóm tắt” ở cột phải, dính khi cuộn; hẹp hơn 1180px thì xuống dưới nội dung. */
export function BookingSummaryCard({ pet, children, footer }: BookingSummaryCardProps) {
  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardHeader title="Tóm tắt" />
        <CardBody>
          {pet ? (
            <PetLine
              species={pet.species}
              name={pet.name}
              meta={`${SPECIES_LABELS[pet.species]} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`}
            />
          ) : (
            <p className="text-muted">Chưa chọn thú cưng.</p>
          )}
          <div className="my-3 h-px bg-line-soft" />
          {children}
        </CardBody>
        <CardFooter>
          <div className="flex w-full flex-col gap-2.5">
            {footer}
            <p className="text-center text-[13px] leading-5 text-muted">Lịch tạo ra ở trạng thái Chờ xác nhận.</p>
          </div>
        </CardFooter>
      </Card>
    </aside>
  );
}

/** Bố cục 2 cột của SW-06 (`.split` của ui-demo): nội dung bên trái, tóm tắt bên phải. */
export const BOOKING_SPLIT_CLASS =
  "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]";
