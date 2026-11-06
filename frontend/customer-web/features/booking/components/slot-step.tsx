import { DateStrip } from "@/components/domain/date-strip";
import { SlotPicker } from "@/components/domain/slot-picker";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError } from "@/lib/api/errors";
import type { SpaSlots } from "@/lib/api/types";
import { formatDuration, formatWeekdayDayMonth } from "@/lib/format";
import type { PricedService } from "../spa-booking";

/** Vùng 5 – dải 7 ngày từ hôm nay. */
export function DatePickerCard({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <Card>
      <CardHeader title="Chọn ngày" />
      <CardBody>
        <DateStrip name="booking-date" label="Chọn ngày" dates={dates} value={value} onChange={onChange} />
      </CardBody>
    </Card>
  );
}

function SlotSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải khung giờ" className="grid grid-cols-5 gap-2 max-[640px]:grid-cols-3">
      {Array.from({ length: 10 }, (_, index) => (
        <Skeleton key={index} className="h-[58px] rounded-xl" />
      ))}
    </div>
  );
}

type SlotCardProps = {
  date: string;
  slots: SpaSlots | undefined;
  error: ApiError | null;
  onRetry: () => void;
  value: string | null;
  endTime?: string;
  isPast: (time: string) => boolean;
  hasOpenSlot: boolean;
  /** Dịch vụ quyết định mốc cuối của lịch. */
  limitingService: PricedService | null;
  onChange: (time: string) => void;
};

/** Vùng 6 – mốc giờ theo ngày; chỉ chọn được mốc còn chỗ (FR-BOOK-02). */
export function SlotPickerCard({
  date,
  slots,
  error,
  onRetry,
  value,
  endTime,
  isPast,
  hasOpenSlot,
  limitingService,
  onChange,
}: SlotCardProps) {
  let content;
  if (error) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button onClick={onRetry}>Thử lại</Button>
      </div>
    );
  } else if (!slots) {
    content = <SlotSkeleton />;
  } else {
    content = (
      <>
        {!hasOpenSlot && (
          <Alert tone="warn" className="mb-4">
            Ngày này đã kín, vui lòng chọn ngày khác.
          </Alert>
        )}
        <SlotPicker
          name="booking-slot"
          label="Chọn khung giờ"
          slots={slots.slots}
          value={value}
          endTime={endTime}
          isPast={isPast}
          onChange={onChange}
        />
        <Alert className="mt-4">
          Lịch này cần {slots.staffRequired} nhân viên trong {formatDuration(slots.durationMinutes)}. Cửa hàng sẽ xếp
          nhân viên khi xác nhận, bạn không cần chọn.
          {limitingService && ` ${limitingService.name} nhận muộn nhất lúc ${limitingService.latestStartTime}.`}
        </Alert>
      </>
    );
  }

  return (
    <Card>
      <CardHeader title={`Chọn khung giờ, ${formatWeekdayDayMonth(date)}`} />
      <CardBody>{content}</CardBody>
    </Card>
  );
}
