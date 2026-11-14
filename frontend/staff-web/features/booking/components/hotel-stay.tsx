import type { MouseEvent, ReactNode } from "react";
import { SumFact, SumTotal } from "@/components/domain/summary";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/errors";
import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { addDays } from "@/lib/time";
import {
  CHECK_OUT_BEFORE_MESSAGE,
  describeCageFit,
  describeNights,
  formatStayMoment,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "../hotel-booking";

// Thẻ “Thời gian gửi và đón” chép từ CW-07 của Giang (PR #50) để hai web giống nhau; bỏ alert khóa tự đặt lịch
// (lễ tân đặt thay không bị khóa – BR-15) và thêm chú thích lưu trú không kèm spa như ui-demo SW-06.

// Ẩn biểu tượng mặc định của trình duyệt (UI demo chỉ có biểu tượng bên trái), bấm vào ô thì mở bộ chọn ngày/giờ.
const PICKER_INPUT_CLASS = "[&::-webkit-calendar-picker-indicator]:hidden";

function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Trình duyệt không hỗ trợ hoặc chặn showPicker: khách vẫn gõ được bằng bàn phím.
  }
}

/** Kết quả kiểm tra còn chỗ của vùng 3. */
export type AvailabilityView =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; error: ApiError; onRetry: () => void }
  | { kind: "available"; nights: number }
  | { kind: "full" };

type StayTimeCardProps = {
  pet: Pet | null;
  times: StayTimes;
  errors: StayErrors;
  today: string;
  onChange: (field: StayField, value: string) => void;
  availability: AvailabilityView;
};

function AvailabilityResult({ pet, checkInDate, view }: { pet: Pet | null; checkInDate: string; view: AvailabilityView }) {
  switch (view.kind) {
    case "idle":
      return null;
    case "checking":
      return (
        <Alert tone="neutral" icon="hourglass">
          Đang kiểm tra chỗ trống…
        </Alert>
      );
    case "error":
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={view.error} className="w-full" />
          <Button onClick={view.onRetry}>Kiểm tra lại</Button>
        </div>
      );
    case "available":
      return (
        <Alert tone="success" title="Còn chỗ">
          Còn chuồng phù hợp cho {pet ? describeCageFit(pet) : "bé"} trong{" "}
          {view.nights > 1 ? `cả ${view.nights} đêm` : "đêm"} {describeNights(checkInDate, view.nights)}.
        </Alert>
      );
    case "full":
      return (
        <Alert tone="danger" title="Hết chỗ">
          Hết chỗ trong thời gian này, vui lòng chọn ngày khác.
        </Alert>
      );
  }
}

/** SW-06 vùng 8 – thời gian gửi và đón, kết quả còn chỗ (như CW-07 vùng 3). */
export function StayTimeCard({ pet, times, errors, today, onChange, availability }: StayTimeCardProps) {
  // Ngày trả sớm nhất là ngày sau ngày nhận (ít nhất 1 đêm).
  const minCheckOut = addDays(times.checkInDate || today, 1);
  return (
    <Card>
      <CardHeader title="Thời gian gửi và đón" />
      <CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
          <Field id="stay-check-in-date" label="Ngày nhận" required error={errors.checkInDate}>
            {(control) => (
              <Input
                {...control}
                type="date"
                prefixIcon="calendar"
                className={PICKER_INPUT_CLASS}
                onClick={openPicker}
                min={today}
                value={times.checkInDate}
                onChange={(event) => onChange("checkInDate", event.target.value)}
              />
            )}
          </Field>
          <Field id="stay-check-in-time" label="Giờ nhận" required error={errors.checkInTime}>
            {(control) => (
              <Input
                {...control}
                type="time"
                prefixIcon="clock"
                className={PICKER_INPUT_CLASS}
                onClick={openPicker}
                value={times.checkInTime}
                onChange={(event) => onChange("checkInTime", event.target.value)}
              />
            )}
          </Field>
          <Field id="stay-check-out-date" label="Ngày trả" required error={errors.checkOutDate}>
            {(control) => (
              <Input
                {...control}
                type="date"
                prefixIcon="calendar"
                className={PICKER_INPUT_CLASS}
                onClick={openPicker}
                min={minCheckOut}
                value={times.checkOutDate}
                onChange={(event) => onChange("checkOutDate", event.target.value)}
              />
            )}
          </Field>
          <Field id="stay-check-out-time" label="Giờ trả" required error={errors.checkOutTime}>
            {(control) => (
              <Input
                {...control}
                type="time"
                prefixIcon="clock"
                className={PICKER_INPUT_CLASS}
                onClick={openPicker}
                value={times.checkOutTime}
                onChange={(event) => onChange("checkOutTime", event.target.value)}
              />
            )}
          </Field>
        </div>
        <p className="text-[13px] leading-[18px] text-muted">
          Số đêm tính theo ngày nhận và ngày trả. Cửa hàng giữ chỗ tối đa 15 phút sau giờ nhận.
        </p>
        <div aria-live="polite" className="empty:hidden">
          <AvailabilityResult pet={pet} checkInDate={times.checkInDate} view={availability} />
        </div>
        <p className="text-[13px] leading-[18px] text-muted">
          Lưu trú không kèm dịch vụ spa. Nếu khách muốn tắm cho bé, tạo thêm lịch spa riêng.
        </p>
      </CardBody>
    </Card>
  );
}

type HotelSummaryFactsProps = {
  times: StayTimes;
  errors: StayErrors;
  /** Số đêm đã biết (từ API, hoặc tính ở web khi ngày hợp lệ); `null` khi chưa đủ dữ liệu. */
  nights: number | null;
  price: HotelPricingRow | null;
  /** Tiền lưu trú: `estimatedAmount` của API, chưa có thì tính ở web chỉ để xem. */
  amount: number | null;
  /** Đã tải xong giá lưu trú; chưa xong thì chưa báo “chưa thiết lập giá”. */
  pricingLoaded: boolean;
};

function momentOrPlaceholder(date: string, time: string) {
  return date && time ? formatStayMoment(date, time) : "Chưa chọn";
}

/** Phần lưu trú của “Tóm tắt” (SW-06 vùng 7): Nhận, Trả, Số đêm, Tiền lưu trú kèm công thức “n × (giá + thức ăn)”. */
export function HotelSummaryFacts({ times, errors, nights, price, amount, pricingLoaded }: HotelSummaryFactsProps) {
  const checkOutInvalid = errors.checkOutDate === CHECK_OUT_BEFORE_MESSAGE;
  let formula = "Chọn thời gian gửi và đón để tính tiền lưu trú";
  if (price && nights !== null) {
    formula = `${nights} × (${formatMoney(price.pricePerNight)} + ${formatMoney(price.foodPerNight)})`;
  } else if (!price && pricingLoaded) {
    formula = "Cửa hàng chưa thiết lập giá lưu trú cho loài và nhóm này";
  }

  return (
    <>
      <div className="text-sm">
        <SumFact label="Nhận">{momentOrPlaceholder(times.checkInDate, times.checkInTime)}</SumFact>
        <SumFact label="Trả">
          {checkOutInvalid ? (
            <span className="text-danger">Chưa hợp lệ</span>
          ) : (
            momentOrPlaceholder(times.checkOutDate, times.checkOutTime)
          )}
        </SumFact>
        <SumFact label="Số đêm">{nights ?? "–"}</SumFact>
      </div>
      <SumTotal label="Tiền lưu trú" amount={amount ?? 0} note={formula} />
    </>
  );
}

/** Lý do nút tạo lịch bị khóa (`.btn-reason` của ui-demo). */
export function DisabledReason({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
      <Icon name="lock" className="mt-px size-3.5" />
      {children}
    </p>
  );
}
