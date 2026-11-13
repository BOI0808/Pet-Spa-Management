"use client";

// SW-06, tab Lưu trú – UI-Screens SW-06 vùng 7, 8 (như CW-07); FR-HTL-04. Logic theo CW-07 của Giang (PR #50):
// đủ 4 ô và hợp lệ thì tự kiểm tra còn chỗ sau 400ms; số đêm, tiền tính ở web chỉ để xem, có kết quả API thì dùng của API.
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useCreateHotelAppointment, useHotelAvailability, useHotelPricing } from "@/lib/queries/hotel";
import { ROUTES } from "@/lib/routes";
import { daysBetween, getStoreToday } from "@/lib/time";
import {
  CHECK_OUT_BEFORE_MESSAGE,
  EMPTY_STAY_TIMES,
  checkInAt,
  checkOutAt,
  findStayPrice,
  validateStay,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "../hotel-booking";
import { useDebouncedValue } from "../use-debounced-value";
import { BOOKING_SPLIT_CLASS, BookingSummaryCard } from "./booking-summary-card";
import { DisabledReason, HotelSummaryFacts, StayTimeCard, type AvailabilityView } from "./hotel-stay";

const AVAILABILITY_DELAY_MS = 400;

const NO_PET_MESSAGE = "Vui lòng chọn thú cưng.";
const FULL_REASON = "Hết chỗ trong thời gian đã chọn.";

/** Lỗi “bắt buộc” chỉ hiện sau lần bấm tạo lịch đầu tiên; lỗi ngày trả, thời điểm đã qua hiện ngay khi đủ ô. */
function visibleErrors(errors: StayErrors, times: StayTimes, showRequired: boolean): StayErrors {
  if (showRequired) return { ...errors };
  const visible: StayErrors = {};
  for (const [field, message] of Object.entries(errors) as [StayField, string][]) {
    if (times[field]) visible[field] = message;
  }
  return visible;
}

type HotelBookingFormProps = {
  customerId: string;
  pet: Pet | null;
  petCard: ReactNode;
  notice: ReactNode;
};

export function HotelBookingForm({ customerId, pet, petCard, notice }: HotelBookingFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();

  const [times, setTimes] = useState<StayTimes>(EMPTY_STAY_TIMES);
  // Mốc “bây giờ” để chặn thời điểm nhận đã qua; cập nhật khi sửa ô hoặc bấm tạo lịch để hàm render vẫn thuần.
  const [now, setNow] = useState(() => Date.now());
  const [today] = useState(getStoreToday);
  const [showRequired, setShowRequired] = useState(false);
  const [petMessage, setPetMessage] = useState<string | null>(null);

  const errors = validateStay(times, now);
  const shownErrors = visibleErrors(errors, times, showRequired);
  const isStayValid = Object.keys(errors).length === 0;

  const params = pet && isStayValid ? { from: checkInAt(times), to: checkOutAt(times), petId: pet.petId } : null;
  const paramsKey = params ? JSON.stringify(params) : "";
  const debouncedKey = useDebouncedValue(paramsKey, AVAILABILITY_DELAY_MS);
  const isSettled = params !== null && debouncedKey === paramsKey;
  const availability = useHotelAvailability(params ?? { from: "", to: "", petId: "" }, { enabled: isSettled });

  const hotelPricing = useHotelPricing();
  const createBooking = useCreateHotelAppointment();

  const noCapacity = createBooking.error?.code === "NO_CAPACITY";
  const isFull = noCapacity || (isSettled && availability.data?.available === false);

  let availabilityView: AvailabilityView = { kind: "idle" };
  if (params) {
    if (isFull) availabilityView = { kind: "full" };
    else if (!isSettled || availability.isPending) availabilityView = { kind: "checking" };
    else if (availability.isError)
      availabilityView = { kind: "error", error: availability.error, onRetry: () => void availability.refetch() };
    else if (availability.data) availabilityView = { kind: "available", nights: availability.data.nights };
  }

  const price = findStayPrice(hotelPricing.data?.pricing, pet);
  const apiResult = isSettled ? availability.data : undefined;
  const datesOk = times.checkInDate && times.checkOutDate && !errors.checkInDate && !errors.checkOutDate;
  const nights = apiResult?.nights ?? (datesOk ? daysBetween(times.checkInDate, times.checkOutDate) : null);
  const amount =
    apiResult?.estimatedAmount ?? (price && nights !== null ? nights * (price.pricePerNight + price.foodPerNight) : null);

  // 400 khi tạo lịch: lỗi dưới ô Ngày trả (UI-Screens CW-07).
  const badRequest = createBooking.error?.status === 400 ? createBooking.error : null;
  if (badRequest && !shownErrors.checkOutDate) shownErrors.checkOutDate = getErrorMessage(badRequest);
  const submitError = createBooking.error && !badRequest && !noCapacity ? createBooking.error : null;

  const checkOutInvalid = errors.checkOutDate === CHECK_OUT_BEFORE_MESSAGE && Boolean(times.checkOutDate);
  let disabledReason: string | null = null;
  if (isFull) disabledReason = FULL_REASON;
  else if (checkOutInvalid) disabledReason = CHECK_OUT_BEFORE_MESSAGE;

  // Đổi thú cưng: kết quả còn chỗ tự tính lại theo `petId` mới; chỉ cần bỏ lỗi của lần tạo lịch trước.
  const [shownPetId, setShownPetId] = useState(pet?.petId ?? null);
  if ((pet?.petId ?? null) !== shownPetId) {
    setShownPetId(pet?.petId ?? null);
    setPetMessage(null);
    createBooking.reset();
  }

  function changeTime(field: StayField, value: string) {
    setTimes((current) => ({ ...current, [field]: value }));
    setNow(Date.now());
    createBooking.reset();
  }

  function submit() {
    const current = Date.now();
    setNow(current);
    setShowRequired(true);
    if (!pet) setPetMessage(NO_PET_MESSAGE);
    if (!pet || Object.keys(validateStay(times, current)).length > 0) return;

    createBooking.mutate(
      { petId: pet.petId, plannedCheckIn: checkInAt(times), plannedCheckOut: checkOutAt(times), customerId },
      {
        onSuccess: ({ appointmentId }) => {
          showSuccess(`Đã tạo lịch lưu trú ${formatAppointmentCode(appointmentId)}, đang chờ quản lý xác nhận`);
          router.push(ROUTES.appointments);
        },
        onError: (error) => {
          // 400 hiện dưới ô Ngày trả, 409 hiện ở kết quả còn chỗ; lỗi khác ở đầu nội dung.
          if (error.status !== 400 && error.code !== "NO_CAPACITY") window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  return (
    <div className={BOOKING_SPLIT_CLASS}>
      <div className="flex min-w-0 flex-col gap-4">
        {submitError && <ErrorAlert error={submitError} />}
        {petCard}
        <StayTimeCard
          pet={pet}
          times={times}
          errors={shownErrors}
          today={today}
          onChange={changeTime}
          availability={availabilityView}
        />
        {notice}
      </div>

      <BookingSummaryCard
        pet={pet}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={disabledReason !== null}
              loading={createBooking.isPending}
              onClick={submit}
            >
              Tạo lịch lưu trú
            </Button>
            {disabledReason && <DisabledReason>{disabledReason}</DisabledReason>}
            <FieldError message={petMessage ?? undefined} />
          </>
        }
      >
        {hotelPricing.isError ? (
          <ErrorAlert error={hotelPricing.error} />
        ) : (
          <HotelSummaryFacts
            times={times}
            errors={shownErrors}
            nights={nights}
            price={price}
            amount={amount}
            pricingLoaded={hotelPricing.isSuccess}
          />
        )}
      </BookingSummaryCard>
    </div>
  );
}
