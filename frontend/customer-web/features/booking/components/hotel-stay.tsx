import type { MouseEvent, ReactNode } from "react";
import { PetLine } from "@/components/domain/pet-line";
import { SumFact, SumTotal } from "@/components/domain/summary";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/errors";
import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { addDays } from "@/lib/time";
import {
  describeCageFit,
  describeNights,
  formatStayMoment,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "../hotel-booking";

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
  /** `onRetry` chỉ có với lỗi thử lại được (mất mạng, 5xx, 429); 400 thử lại vẫn ra cùng lỗi nên không có nút. */
  | { kind: "error"; error: ApiError; onRetry?: () => void }
  | { kind: "available"; nights: number }
  | { kind: "full" }
  /**
   * CW-10: `GET /hotel/availability` báo hết chỗ nhưng thời gian mới trùng các đêm của chính lịch đang đổi, mà API vẫn
   * tính chuồng của lịch này là đã giữ. Backend bỏ lịch này ra khi đổi nên chưa chắc hết chỗ; vẫn cho gửi.
   */
  | { kind: "own-hold" };

type StayTimeCardProps = {
  pet: Pet | null;
  times: StayTimes;
  errors: StayErrors;
  today: string;
  onChange: (field: StayField, value: string) => void;
  availability: AvailabilityView;
  /** Alert tài khoản bị khóa (403 `BOOKING_LOCKED`), đặt cuối thẻ như UI demo. */
  lockedAlert?: ReactNode;
  /** Tiêu đề thẻ; CW-10 dùng “Thời gian mới”. */
  title?: string;
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
          {view.onRetry && <Button onClick={view.onRetry}>Kiểm tra lại</Button>}
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
    case "own-hold":
      return (
        <Alert tone="warn" title="Chưa chắc còn chỗ">
          Thời gian mới trùng với lịch hiện tại của bé nên kết quả còn tính cả chuồng bé đang giữ. Cửa hàng kiểm tra lại
          khi bạn gửi yêu cầu; nếu hết chỗ, bạn sẽ được báo để chọn ngày khác.
        </Alert>
      );
  }
}

/** Vùng 3 – thời gian gửi và đón, kết quả còn chỗ. */
export function StayTimeCard({
  pet,
  times,
  errors,
  today,
  onChange,
  availability,
  lockedAlert,
  title = "Thời gian gửi và đón",
}: StayTimeCardProps) {
  // Ngày trả sớm nhất là ngày sau ngày nhận (ít nhất 1 đêm).
  const minCheckOut = addDays(times.checkInDate || today, 1);
  return (
    <Card>
      <CardHeader title={title} />
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
        {lockedAlert}
      </CardBody>
    </Card>
  );
}

type HotelSummaryProps = {
  pet: Pet | null;
  times: StayTimes;
  /** Ngày trả không sau ngày nhận (`validateStay`): dòng Trả ghi “Chưa hợp lệ”. */
  checkOutTooEarly: boolean;
  /** Số đêm đã biết (từ API, hoặc tính ở web khi ngày hợp lệ); `null` khi chưa đủ dữ liệu. */
  nights: number | null;
  price: HotelPricingRow | null;
  /** Tiền lưu trú: `estimatedAmount` của API, chưa có thì tính ở web chỉ để xem. */
  amount: number | null;
  lateFeePerBlock?: number;
  children: ReactNode;
};

function momentOrPlaceholder(date: string, time: string) {
  return date && time ? formatStayMoment(date, time) : "Chưa chọn";
}

/** Vùng 5 – tạm tính, dính bên phải khi cuộn. */
export function HotelSummary({
  pet,
  times,
  checkOutTooEarly,
  nights,
  price,
  amount,
  lateFeePerBlock,
  children,
}: HotelSummaryProps) {
  let formula = "Chọn thời gian gửi và đón để tính tiền lưu trú";
  if (price && nights !== null) {
    formula = `${nights} × (${formatMoney(price.pricePerNight)} + ${formatMoney(price.foodPerNight)})`;
  } else if (pet && nights !== null && amount === null) {
    formula = "Cửa hàng chưa có giá lưu trú cho loài và nhóm của bé";
  }

  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardHeader title="Tạm tính" />
        <CardBody>
          {pet ? (
            <PetLine
              species={pet.species}
              name={pet.name}
              meta={`${SPECIES_LABELS[pet.species]}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`}
            />
          ) : (
            <p className="text-muted">Chưa chọn thú cưng.</p>
          )}
          <div className="my-3 h-px bg-line-soft" />
          <div className="text-sm">
            <SumFact label="Nhận">{momentOrPlaceholder(times.checkInDate, times.checkInTime)}</SumFact>
            <SumFact label="Trả">
              {checkOutTooEarly ? (
                <span className="text-danger">Chưa hợp lệ</span>
              ) : (
                momentOrPlaceholder(times.checkOutDate, times.checkOutTime)
              )}
            </SumFact>
            <SumFact label="Số đêm">{nights ?? "–"}</SumFact>
            <SumFact label="Chỗ ở / đêm">
              <span className="tabular-nums">{price ? formatMoney(price.pricePerNight) : "–"}</span>
            </SumFact>
            <SumFact label="Thức ăn / đêm">
              <span className="tabular-nums">{price ? formatMoney(price.foodPerNight) : "–"}</span>
            </SumFact>
          </div>
          <SumTotal label="Tiền lưu trú" amount={amount} note={formula} />
          <p className="mt-3 text-xs leading-4 text-muted">
            Thanh toán tại quầy khi gửi bé. Cửa hàng cân lại bé khi tiếp nhận nên số tiền có thể thay đổi.
            {lateFeePerBlock !== undefined &&
              ` Đón trễ quá 30 phút tính phí ${formatMoney(lateFeePerBlock)} cho mỗi 60 phút.`}
          </p>
        </CardBody>
        <CardFooter>
          <div className="flex w-full flex-col gap-2.5">{children}</div>
        </CardFooter>
      </Card>
    </aside>
  );
}
