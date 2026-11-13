"use client";

// CW-07 Đặt lịch lưu trú – UI-Screens.md, UC-28, FR-HTL-04
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { useCreateHotelAppointment, useHotelAvailability } from "@/lib/queries/hotel-booking";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";
import { usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { daysBetween, getStoreToday } from "@/lib/time";
import { PetPickerCard } from "../components/pet-step";
import { BookingLockedAlert } from "../components/review-step";
import { DisabledReason, HotelSummary, StayTimeCard, type AvailabilityView } from "../components/hotel-stay";
import {
  CHECK_OUT_BEFORE_MESSAGE,
  EMPTY_STAY_TIMES,
  checkInAt,
  checkOutAt,
  describeHotelPet,
  findStayPrice,
  validateStay,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "../hotel-booking";
import { BookingSkeleton } from "./spa-booking-screen";
import { useDebouncedValue } from "../use-debounced-value";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
const AVAILABILITY_DELAY_MS = 400;

const NO_PET_MESSAGE = "Vui lòng chọn thú cưng.";
const FULL_REASON = "Hết chỗ trong thời gian đã chọn.";
const LOCKED_REASON = "Tài khoản tạm thời không thể tự đặt lịch.";

/** Lỗi “bắt buộc” chỉ hiện sau lần bấm gửi đầu tiên; lỗi ngày trả, thời điểm đã qua hiện ngay khi đủ ô. */
function visibleErrors(errors: StayErrors, times: StayTimes, showRequired: boolean): StayErrors {
  if (showRequired) return { ...errors };
  const visible: StayErrors = {};
  for (const [field, message] of Object.entries(errors) as [StayField, string][]) {
    if (times[field]) visible[field] = message;
  }
  return visible;
}

/** Vùng 2 → 5 khi đã có danh sách thú cưng. */
function HotelBookingFlow({ pets }: { pets: Pet[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();

  const [petId, setPetId] = useState(searchParams.get("petId"));
  const [times, setTimes] = useState<StayTimes>(EMPTY_STAY_TIMES);
  // Mốc “bây giờ” để chặn thời điểm nhận đã qua; cập nhật khi khách sửa ô hoặc bấm gửi để hàm render vẫn thuần.
  const [now, setNow] = useState(() => Date.now());
  const [today] = useState(getStoreToday);
  const [showRequired, setShowRequired] = useState(false);
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const pet = pets.find((item) => item.petId === petId) ?? null;
  const errors = validateStay(times, now);
  const shownErrors = visibleErrors(errors, times, showRequired);
  const isStayValid = Object.keys(errors).length === 0;

  // Đủ và hợp lệ → tự kiểm tra còn chỗ sau 400ms kể từ lần sửa cuối (UI-Screens CW-07, Đề xuất).
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

  // Số đêm, tiền ở web chỉ để xem; có kết quả API thì dùng của API (BR-22).
  const price = findStayPrice(hotelPricing.data?.pricing, pet);
  const apiResult = isSettled ? availability.data : undefined;
  const checkOutOk = times.checkInDate && times.checkOutDate && !errors.checkInDate && !errors.checkOutDate;
  const nights = apiResult?.nights ?? (checkOutOk ? daysBetween(times.checkInDate, times.checkOutDate) : null);
  const amount =
    apiResult?.estimatedAmount ?? (price && nights !== null ? nights * (price.pricePerNight + price.foodPerNight) : null);

  // 400 khi gửi: lỗi dưới ô Ngày trả (UI-Screens CW-07).
  const badRequest = createBooking.error?.status === 400 ? createBooking.error : null;
  if (badRequest && !shownErrors.checkOutDate) shownErrors.checkOutDate = getErrorMessage(badRequest);
  const submitError =
    createBooking.error && !badRequest && !noCapacity && !isLocked ? createBooking.error : null;

  const checkOutInvalid = errors.checkOutDate === CHECK_OUT_BEFORE_MESSAGE && Boolean(times.checkOutDate);
  let disabledReason: string | null = null;
  if (isLocked) disabledReason = LOCKED_REASON;
  else if (isFull) disabledReason = FULL_REASON;
  else if (checkOutInvalid) disabledReason = CHECK_OUT_BEFORE_MESSAGE;

  function selectPet(nextPetId: string) {
    setPetId(nextPetId);
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
      { petId: pet.petId, plannedCheckIn: checkInAt(times), plannedCheckOut: checkOutAt(times) },
      {
        onSuccess: ({ appointmentId }) => {
          showSuccess("Đã gửi yêu cầu lưu trú");
          // Thay lịch sử để nút Quay lại không về form của lịch vừa tạo.
          router.replace(ROUTES.appointmentDetail(appointmentId));
        },
        onError: (error) => {
          if (error.code === "BOOKING_LOCKED") setIsLocked(true);
          // Lỗi chung hiện ở đầu nội dung, trên điện thoại nút gửi nằm cuối trang.
          if (error.status !== 400 && error.code !== "NO_CAPACITY") window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {submitError && <ErrorAlert error={submitError} />}
        <PetPickerCard
          pets={pets}
          petId={pet?.petId ?? null}
          onSelect={selectPet}
          describe={describeHotelPet}
          showAddLink={false}
        />
        <StayTimeCard
          pet={pet}
          times={times}
          errors={shownErrors}
          today={today}
          onChange={changeTime}
          availability={availabilityView}
          lockedAlert={isLocked && <BookingLockedAlert />}
        />
        <Alert tone="neutral">
          Muốn tắm hoặc cắt tỉa cho bé trong thời gian lưu trú? Hãy{" "}
          <Link
            href={pet ? ROUTES.spaBookingForPet(pet.petId) : ROUTES.spaBooking}
            className="font-semibold text-lagoon hover:text-lagoon-700"
          >
            đặt lịch spa riêng
          </Link>
          .
        </Alert>
      </div>

      <HotelSummary
        pet={pet}
        times={times}
        errors={shownErrors}
        nights={nights}
        price={price}
        amount={amount}
        lateFeePerBlock={hotelPricing.data?.lateFeePerBlock}
      >
        <Button
          variant="primary"
          size="lg"
          block
          disabled={disabledReason !== null}
          loading={createBooking.isPending}
          onClick={submit}
        >
          Gửi yêu cầu lưu trú
        </Button>
        {disabledReason && <DisabledReason>{disabledReason}</DisabledReason>}
        <FieldError message={petMessage ?? undefined} />
      </HotelSummary>
    </div>
  );
}

/** `/dat-lich/luu-tru` (`?petId=` chọn sẵn thú cưng). */
export function HotelBookingScreen() {
  const pets = usePets(PET_LIST_PARAMS);

  let content;
  if (pets.isPending) {
    content = <BookingSkeleton />;
  } else if (pets.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={pets.error} className="w-full" />
        <Button onClick={() => void pets.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (pets.data.items.length === 0) {
    content = (
      <Card>
        <EmptyState
          title="Chưa có thú cưng"
          description="Thêm hồ sơ cho bé để đặt lịch lưu trú."
          action={
            <ButtonLink href={ROUTES.petNew}>
              <Icon name="plus" />
              Thêm thú cưng
            </ButtonLink>
          }
        />
      </Card>
    );
  } else {
    content = <HotelBookingFlow pets={pets.data.items} />;
  }

  return (
    <>
      <PageHeader
        title="Đặt lịch lưu trú"
        description="Bé ở chuồng riêng hợp loài và kích cỡ, có thức ăn do cửa hàng chuẩn bị. Lưu trú không kèm dịch vụ spa."
      />
      {content}
    </>
  );
}
