import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HotelPricingRow } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SIZE_GROUP_ORDER, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";

// `.table` của ui-demo.
const HEAD_CELL_CLASS = "whitespace-nowrap bg-mist px-3 py-2.5 max-[1180px]:px-2.5 text-left text-xs font-semibold text-muted";
const CELL_CLASS = "whitespace-nowrap border-t border-line-soft px-3 py-3 tabular-nums max-[1180px]:px-2.5";

function PricingTable({ pricing }: { pricing: HotelPricingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={HEAD_CELL_CLASS}>Loài</th>
            <th className={HEAD_CELL_CLASS}>Nhóm</th>
            <th className={HEAD_CELL_CLASS}>Chỗ ở</th>
            <th className={HEAD_CELL_CLASS}>Thức ăn</th>
            <th className={HEAD_CELL_CLASS}>Cộng / đêm</th>
          </tr>
        </thead>
        <tbody>
          {SPECIES_ORDER.flatMap((species) => {
            const rows = SIZE_GROUP_ORDER.flatMap((sizeGroup) =>
              pricing.filter((row) => row.species === species && row.sizeGroup === sizeGroup),
            );
            return rows.map((row, index) => (
              <tr key={`${row.species}-${row.sizeGroup}`}>
                {index === 0 && (
                  <th scope="rowgroup" rowSpan={rows.length} className={`${CELL_CLASS} text-left font-normal`}>
                    <span className="flex items-center gap-2">
                      <PetAvatar species={species} size="sm" />
                      {SPECIES_LABELS[species]}
                    </span>
                  </th>
                )}
                <td className={CELL_CLASS}>{SIZE_GROUP_LABELS[row.sizeGroup]}</td>
                <td className={CELL_CLASS}>{formatMoney(row.pricePerNight)}</td>
                <td className={CELL_CLASS}>{formatMoney(row.foodPerNight)}</td>
                {/* Chỉ để khách xem; tiền của lịch lưu trú do backend tính (BR-17). */}
                <td className={`${CELL_CLASS} font-semibold`}>{formatMoney(row.pricePerNight + row.foodPerNight)}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Vùng 5 – bảng giá lưu trú mỗi đêm. */
export function HotelPricingTable() {
  const hotelPricing = useHotelPricing();

  let content;
  if (hotelPricing.isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải giá lưu trú" className="flex flex-col gap-3 p-5">
        <Skeleton className="h-6" />
        <Skeleton className="h-6" />
        <Skeleton className="h-6" />
      </div>
    );
  } else if (hotelPricing.isError) {
    content = (
      <div className="flex flex-col items-start gap-3 p-5">
        <ErrorAlert error={hotelPricing.error} className="w-full" />
        <Button onClick={() => void hotelPricing.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (hotelPricing.data.pricing.length === 0) {
    content = <p className="px-5 py-10 text-center text-muted">Cửa hàng chưa công bố giá lưu trú.</p>;
  } else {
    content = <PricingTable pricing={hotelPricing.data.pricing} />;
  }

  return (
    <section className="min-w-0">
      <h2 className="mb-3">Giá lưu trú mỗi đêm</h2>
      <Card className="overflow-hidden">{content}</Card>
      {hotelPricing.isSuccess && hotelPricing.data.pricing.length > 0 && (
        <p className="mt-2 text-xs leading-4 text-muted">
          Đón trễ quá 30 phút so với giờ trả đã hẹn: {formatMoney(hotelPricing.data.lateFeePerBlock)} cho mỗi 60 phút
          tiếp theo.
        </p>
      )}
    </section>
  );
}
