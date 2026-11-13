import type { MouseEvent, ReactNode } from "react";
import { PetLine } from "@/components/domain/pet-line";
import { SumFact, SumTotal } from "@/components/domain/summary";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/errors";
import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
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
  /** Alert tài khoản bị khóa (403 `BOOKING_LOCKED`), đặt cuối thẻ như UI demo. */
  lockedAlert?: ReactNode;
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

/** Vùng 3 – thời gian gửi và đón, kết quả còn chỗ. */
export function StayTimeCard({ pet, times, errors, today, onChange, availability, lockedAlert }: StayTimeCardProps) {
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
        {lockedAlert}
      </CardBody>
    </Card>
  );
}

type HotelSummaryProps = {
  pet: Pet | null;
  times: StayTimes;
  errors: StayErrors;
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
export function HotelSummary({ pet, times, errors, nights, price, amount, lateFeePerBlock, children }: HotelSummaryProps) {
  const checkOutInvalid = errors.checkOutDate === CHECK_OUT_BEFORE_MESSAGE;
  const formula =
    price && nights !== null
      ? `${nights} × (${formatMoney(price.pricePerNight)} + ${formatMoney(price.foodPerNight)})`
      : "Chọn thời gian gửi và đón để tính tiền lưu trú";

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
              {checkOutInvalid ? (
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
          <SumTotal label="Tiền lưu trú" amount={amount ?? 0} note={formula} />
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

/** Lý do nút gửi bị khóa (`.btn-reason` của ui-demo). */
export function DisabledReason({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
      <Icon name="lock" className="mt-px size-3.5" />
      {children}
    </p>
  );
}
