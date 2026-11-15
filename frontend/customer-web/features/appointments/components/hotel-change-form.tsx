"use client";

// CW-10 lịch lưu trú: thú cưng, vùng 6 (thời gian mới + còn chỗ), vùng 5 (sau khi đổi) – UI-Screens.md, FR-CHG-01.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { getErrorMessage } from "@/lib/api/errors";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useUpdateAppointment } from "@/lib/queries/appointment-changes";
import { useHotelAvailability } from "@/lib/queries/hotel-booking";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";
import { ROUTES } from "@/lib/routes";
import { getStoreToday, toStoreDate, toStoreTime } from "@/lib/time";
import { StayTimeCard } from "@/features/booking/components/hotel-stay";
import {
  AVAILABILITY_DELAY_MS,
  CHECK_OUT_BEFORE_MESSAGE,
  STAY_FULL_REASON,
  buildAvailabilityView,
  checkInAt,
  checkOutAt,
  estimateStay,
  findStayPrice,
  formatStayMoment,
  stayFieldOfError,
  validateStay,
  type StayErrors,
  type StayField,
  type StayTimes,
} from "@/features/booking/hotel-booking";
import { NO_PET_MESSAGE } from "@/features/booking/spa-booking";
import { rangesOverlap, sameInstant } from "../change-appointment";
import { ChangeSummary, CurrentAppointmentBox, PetSelect } from "./change-summary";

const SUCCESS_MESSAGE = "Đã gửi yêu cầu đổi lịch. Lịch đang chờ cửa hàng duyệt lại.";

function initialTimes(appointment: AppointmentDetail): StayTimes {
  const { plannedCheckIn, plannedCheckOut } = appointment;
  if (!plannedCheckIn || !plannedCheckOut) return { checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "" };
  return {
    checkInDate: toStoreDate(plannedCheckIn),
    checkInTime: toStoreTime(plannedCheckIn),
    checkOutDate: toStoreDate(plannedCheckOut),
    checkOutTime: toStoreTime(plannedCheckOut),
  };
}

type HotelChangeFormProps = {
  appointment: AppointmentDetail;
  pets: Pet[];
  currentPet: Pet | null;
  onWindowClosed: (error: unknown) => void;
};

export function HotelChangeForm({ appointment, pets, currentPet, onWindowClosed }: HotelChangeFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();

  const [petId, setPetId] = useState<string | null>(() =>
    pets.some((pet) => pet.petId === appointment.petId) ? appointment.petId : null,
  );
  const [times, setTimes] = useState<StayTimes>(() => initialTimes(appointment));
  const [now, setNow] = useState(() => Date.now());
  const [today] = useState(getStoreToday);
  const [petMessage, setPetMessage] = useState<string | null>(null);

  const pet = pets.find((item) => item.petId === petId) ?? null;
  const { errors, checkOutTooEarly } = validateStay(times, now);
  // Ô đã điền sẵn từ lịch hiện tại nên lỗi hiện ngay.
  const shownErrors: StayErrors = { ...errors };
  const isStayValid = Object.keys(errors).length === 0;

  const { plannedCheckIn, plannedCheckOut } = appointment;
  const hasChanges =
    petId !== appointment.petId ||
    !isStayValid ||
    !sameInstant(checkInAt(times), plannedCheckIn) ||
    !sameInstant(checkOutAt(times), plannedCheckOut);

  // Chưa đổi gì thì không kiểm tra còn chỗ: lịch hiện tại đã được giữ chỗ.
  const params =
    pet && isStayValid && hasChanges ? { from: checkInAt(times), to: checkOutAt(times), petId: pet.petId } : null;
  const paramsKey = params ? JSON.stringify(params) : "";
  const debouncedKey = useDebouncedValue(paramsKey, AVAILABILITY_DELAY_MS);
  const isSettled = params !== null && debouncedKey === paramsKey;
  const availability = useHotelAvailability(params ?? { from: "", to: "", petId: "" }, { enabled: isSettled });
  const hotelPricing = useHotelPricing();
  const update = useUpdateAppointment(appointment.appointmentId, appointment.plannedCheckIn);

  // Gửi bị 409 `NO_CAPACITY` thì lần kiểm tra lại (đã invalidate) quyết định, như CW-07.
  const noCapacity = update.error?.code === "NO_CAPACITY";
  const apiFull =
    isSettled && (availability.data?.available === false || (noCapacity && availability.isFetching));

  // `GET /hotel/availability` vẫn tính chuồng lịch này đang giữ. Nếu báo hết chỗ mà thời gian mới trùng các đêm hiện tại
  // và bé cùng loài, cùng nhóm kích cỡ với lịch (cùng nhóm chuồng) thì chưa chắc hết chỗ: vẫn cho gửi để backend quyết.
  // Backend đã trả `NO_CAPACITY` thì hết chỗ thật.
  // Lịch không có trường loài: lấy từ hồ sơ (`GET /pets/{id}`, hoặc danh sách thú cưng). Chưa biết được (đang tải, lỗi,
  // hồ sơ đã gỡ) thì không kết luận hết chỗ mà coi như có thể cùng nhóm chuồng, để backend quyết khi gửi.
  const currentSpecies =
    currentPet?.species ?? pets.find((item) => item.petId === appointment.petId)?.species ?? null;
  const sameCageGroup =
    pet !== null && pet.sizeGroup === appointment.sizeGroup && (currentSpecies === null || pet.species === currentSpecies);
  const overlapsCurrent =
    params !== null &&
    Boolean(plannedCheckIn && plannedCheckOut) &&
    rangesOverlap(params.from, params.to, plannedCheckIn as string, plannedCheckOut as string);
  const isOwnHold = apiFull && !noCapacity && sameCageGroup && overlapsCurrent;
  const isFull = (apiFull && !isOwnHold) || (noCapacity && !isSettled);

  // 400 của kiểm tra còn chỗ: hiện dưới ô liên quan; không xác định được ô thì alert (như CW-07).
  const availabilityError = isSettled ? availability.error : null;
  const availabilityField = stayFieldOfError(availabilityError);
  if (availabilityError && availabilityField) shownErrors[availabilityField] = getErrorMessage(availabilityError);

  const availabilityView = buildAvailabilityView({
    hasParams: params !== null,
    isSettled,
    isFull,
    isOwnHold,
    isPending: availability.isPending,
    error: availabilityError,
    errorField: availabilityField,
    data: availability.data,
    refetch: () => void availability.refetch(),
  });

  const price = findStayPrice(hotelPricing.data?.pricing, pet);
  const { nights, amount } = estimateStay(times, errors, isSettled ? availability.data : undefined, price);

  // 400 khi gửi: lỗi dưới đúng ô; không xác định được ô thì ErrorAlert chung ở đầu nội dung (như CW-07).
  const submitField = stayFieldOfError(update.error);
  if (update.error && submitField) shownErrors[submitField] = getErrorMessage(update.error);
  const submitError =
    update.error && !submitField && !noCapacity && update.error.code !== "CHANGE_WINDOW_CLOSED" ? update.error : null;

  let disabledReason: string | null = null;
  if (isFull) disabledReason = STAY_FULL_REASON;
  else if (checkOutTooEarly) disabledReason = CHECK_OUT_BEFORE_MESSAGE;

  function selectPet(nextPetId: string) {
    setPetId(nextPetId);
    setPetMessage(null);
    update.reset();
  }

  function changeTime(field: StayField, value: string) {
    setTimes((current) => ({ ...current, [field]: value }));
    setNow(Date.now());
    update.reset();
  }

  function submit() {
    const current = Date.now();
    setNow(current);
    if (!pet) setPetMessage(NO_PET_MESSAGE);
    if (!pet || Object.keys(validateStay(times, current).errors).length > 0) return;

    update.mutate(
      { petId: pet.petId, plannedCheckIn: checkInAt(times), plannedCheckOut: checkOutAt(times) },
      {
        onSuccess: () => {
          showSuccess(SUCCESS_MESSAGE);
          router.replace(ROUTES.appointmentDetail(appointment.appointmentId));
        },
        onError: (error) => {
          if (error.code === "CHANGE_WINDOW_CLOSED") return onWindowClosed(error);
          // Chỉ cuộn lên đầu khi lỗi hiện bằng ErrorAlert ở đầu nội dung.
          if (error.code !== "NO_CAPACITY" && !stayFieldOfError(error)) window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  const moment = (date: string, time: string) => (date && time ? formatStayMoment(date, time) : "Chưa chọn");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {submitError && <ErrorAlert error={submitError} />}
        <CurrentAppointmentBox
          appointment={appointment}
          petName={appointment.petName ?? currentPet?.name ?? "Thú cưng"}
          species={currentPet?.species ?? null}
        />
        <Card>
          <CardHeader title="Thú cưng" />
          <CardBody>
            <PetSelect pets={pets} value={petId} onChange={selectPet} error={petMessage ?? undefined} />
          </CardBody>
        </Card>
        <StayTimeCard
          pet={pet}
          times={times}
          errors={shownErrors}
          today={today}
          onChange={changeTime}
          availability={availabilityView}
          title="Thời gian mới"
        />
      </div>

      <ChangeSummary
        isHotel
        totalLabel="Tiền lưu trú"
        amount={amount}
        hasChanges={hasChanges}
        loading={update.isPending}
        onSubmit={submit}
        appointmentId={appointment.appointmentId}
        validationMessage={null}
        disabledReason={disabledReason}
      >
        <KeyValue label="Thú cưng">{pet?.name ?? "Chưa chọn"}</KeyValue>
        <KeyValue label="Nhận">{moment(times.checkInDate, times.checkInTime)}</KeyValue>
        <KeyValue label="Trả">
          {checkOutTooEarly ? <span className="text-danger">Chưa hợp lệ</span> : moment(times.checkOutDate, times.checkOutTime)}
        </KeyValue>
        <KeyValue label="Số đêm">{nights ?? "–"}</KeyValue>
      </ChangeSummary>
    </div>
  );
}
