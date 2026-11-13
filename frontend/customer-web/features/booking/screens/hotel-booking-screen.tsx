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
import { getErrorMessage, type ApiError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useCreateHotelAppointment, useHotelAvailability } from "@/lib/queries/hotel-booking";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";
import { usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { daysBetween, getStoreToday } from "@/lib/time";
import { DisabledReason } from "../components/disabled-reason";
import { HotelSummary, StayTimeCard, type AvailabilityView } from "../components/hotel-stay";
import { PetPickerCard } from "../components/pet-step";
import { BOOKING_LOCKED_REASON, BookingLockedAlert } from "../components/review-step";
import {
  CHECK_OUT_BEFORE_MESSAGE,
  EMPTY_STAY_TIMES,
  checkInAt,
  checkOutAt,
  describeHotelPet,
  findStayPrice,
  stayFieldOfBadRequest,
  validateStay,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "../hotel-booking";
import { BookingSkeleton } from "./spa-booking-screen";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
const AVAILABILITY_DELAY_MS = 400;

const NO_PET_MESSAGE = "Vui lòng chọn thú cưng.";
const FULL_REASON = "Hết chỗ trong thời gian đã chọn.";

/** Ô nhận lỗi 400; `null` khi không phải 400 hoặc không xác định được ô. */
function badRequestField(error: ApiError | null) {
  return error?.status === 400 ? stayFieldOfBadRequest(error.detail) : null;
}

/**
 * Alert khóa nằm trong thẻ Thời gian, xa nút gửi (trên điện thoại nút ở cuối trang) và hiện ra thì đẩy nút xuống:
 * cuộn tới alert một lần khi nó xuất hiện để khách thấy lý do.
 */
function scrollIntoViewOnMount(node: HTMLDivElement | null) {
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Thử lại có ích khi mất mạng, quá tải (429) hoặc lỗi server; lỗi 4xx khác thử lại vẫn ra như cũ. */
function isRetryable(error: ApiError) {
  return error.kind !== "http" || error.status === 429 || (error.status ?? 0) >= 500;
}

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
  const { errors, checkOutTooEarly } = validateStay(times, now);
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

  // Gửi bị 409 thì lần kiểm tra lại (đã invalidate) quyết định: đang kiểm tra lại vẫn coi là hết chỗ, có kết quả
  // thì theo kết quả mới, nên nếu chỗ vừa trống lại thì nút gửi mở lại mà khách không phải sửa ô nào.
  const noCapacity = createBooking.error?.code === "NO_CAPACITY";
  const isFull =
    isSettled && (availability.data?.available === false || (noCapacity && availability.isFetching));

  // 400 của kiểm tra còn chỗ: hiện dưới ô liên quan như lỗi khi gửi; không xác định được ô thì hiện alert, không có
  // nút thử lại vì gọi lại vẫn ra cùng lỗi.
  const availabilityError = isSettled ? availability.error : null;
  const availabilityField = badRequestField(availabilityError);
  if (availabilityError && availabilityField) shownErrors[availabilityField] = getErrorMessage(availabilityError);

  let availabilityView: AvailabilityView = { kind: "idle" };
  if (params) {
    if (isFull) availabilityView = { kind: "full" };
    else if (!isSettled || availability.isPending) availabilityView = { kind: "checking" };
    else if (availabilityError && !availabilityField)
      availabilityView = {
        kind: "error",
        error: availabilityError,
        onRetry: isRetryable(availabilityError) ? () => void availability.refetch() : undefined,
      };
    else if (availability.data && !availabilityError)
      availabilityView = { kind: "available", nights: availability.data.nights };
  }

  // Số đêm, tiền ở web chỉ để xem; có kết quả API thì dùng của API (BR-22).
  const price = findStayPrice(hotelPricing.data?.pricing, pet);
  const apiResult = isSettled ? availability.data : undefined;
  const checkOutOk = times.checkInDate && times.checkOutDate && !errors.checkInDate && !errors.checkOutDate;
  const nights = apiResult?.nights ?? (checkOutOk ? daysBetween(times.checkInDate, times.checkOutDate) : null);
  const amount =
    apiResult?.estimatedAmount ?? (price && nights !== null ? nights * (price.pricePerNight + price.foodPerNight) : null);

  // 400 khi gửi: lỗi dưới đúng ô (ngày trả → Ngày trả, thời điểm nhận → Giờ nhận), là phản hồi mới nhất nên đè lỗi
  // ở web của ô đó. Không xác định được ô (vd. lỗi về thú cưng) thì hiện ErrorAlert chung ở đầu nội dung.
  const submitField = badRequestField(createBooking.error);
  if (createBooking.error && submitField) shownErrors[submitField] = getErrorMessage(createBooking.error);
  const submitError =
    createBooking.error && !submitField && !noCapacity && createBooking.error.code !== "BOOKING_LOCKED"
      ? createBooking.error
      : null;

  let disabledReason: string | null = null;
  if (isLocked) disabledReason = BOOKING_LOCKED_REASON;
  else if (isFull) disabledReason = FULL_REASON;
  else if (checkOutTooEarly) disabledReason = CHECK_OUT_BEFORE_MESSAGE;

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
    if (!pet || Object.keys(validateStay(times, current).errors).length > 0) return;

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
          // Chỉ cuộn lên đầu khi lỗi hiện bằng ErrorAlert ở đầu nội dung (trên điện thoại nút gửi nằm cuối trang). Hết
          // chỗ, lỗi theo ô: lý do nằm ngay dưới nút gửi hoặc ở ô liên quan. Bị khóa: cuộn tới alert khóa (ở trên).
          const shownInPlace = error.code === "BOOKING_LOCKED" || error.code === "NO_CAPACITY" || badRequestField(error);
          if (!shownInPlace) window.scrollTo({ top: 0, behavior: "smooth" });
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
          lockedAlert={
            isLocked && (
              <div ref={scrollIntoViewOnMount}>
                <BookingLockedAlert />
              </div>
            )
          }
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
        checkOutTooEarly={checkOutTooEarly}
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
