"use client";

// CW-06 Đặt lịch spa (3 bước) – UI-Screens.md
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Stepper } from "@/components/domain/stepper";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Pet, SlotInfo } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth, formatFullDate } from "@/lib/format";
import { useCreateSpaAppointment, useSpaSlots } from "@/lib/queries/appointments";
import { usePets } from "@/lib/queries/pets";
import { useServices } from "@/lib/queries/services";
import { ROUTES } from "@/lib/routes";
import { addDays, addMinutes, getStoreToday, toStoreDateTime } from "@/lib/time";
import { BookingSummary } from "../components/booking-summary";
import { PetPickerCard, ServicePickerCard } from "../components/pet-step";
import { BookingLockedAlert, BookingNotesCard, BookingReviewCard } from "../components/review-step";
import { DatePickerCard, SlotPickerCard } from "../components/slot-step";
import {
  BOOKING_STEPS,
  earliestLatestStart,
  estimateBooking,
  parseStep,
  toPricedServices,
  type BookingStep,
} from "../spa-booking";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
const DATE_COUNT = 7;

const NO_PET_MESSAGE = "Vui lòng chọn thú cưng.";
const NO_SERVICE_MESSAGE = "Vui lòng chọn ít nhất một dịch vụ.";
const NO_SLOT_MESSAGE = "Vui lòng chọn khung giờ.";
const SLOT_FULL_MESSAGE = "Mốc giờ vừa kín, vui lòng chọn mốc khác.";
const SLOT_PAST_MESSAGE = "Mốc giờ này đã qua, vui lòng chọn mốc khác.";
const LOCKED_REASON = "Tài khoản tạm thời không thể tự đặt lịch, vui lòng liên hệ cửa hàng qua hotline.";

function isPastSlot(date: string, time: string, now: number) {
  return Date.parse(toStoreDateTime(date, time)) <= now;
}

/** Vùng 1 → 9 khi đã có danh sách thú cưng. */
function SpaBookingFlow({ pets }: { pets: Pet[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();

  const [petId, setPetId] = useState(searchParams.get("petId"));
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dates] = useState(() => {
    const today = getStoreToday();
    return Array.from({ length: DATE_COUNT }, (_, index) => addDays(today, index));
  });
  const [date, setDate] = useState(dates[0]);
  const [slotTime, setSlotTime] = useState<string | null>(null);
  const [reachedStep, setReachedStep] = useState<BookingStep>(1);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const pet = pets.find((item) => item.petId === petId) ?? null;
  const services = useServices(pet ? { species: pet.species, sizeGroup: pet.sizeGroup } : {}, {
    enabled: pet !== null,
  });
  const pricedServices = useMemo(
    () => (pet && services.data ? toPricedServices(services.data, pet) : []),
    [pet, services.data],
  );
  const selectedServices = pricedServices.filter((service) => serviceIds.includes(service.serviceId));
  const selectedIds = selectedServices.map((service) => service.serviceId);
  // Đổi thú cưng chỉ bỏ dịch vụ không áp dụng (UI-Screens CW-06), nên phải chờ danh sách của bé mới rồi mới lọc được.
  // Xóa hẳn khỏi state để đổi lại bé cũ không tự chọn lại.
  if (pet && services.isSuccess && selectedIds.length !== serviceIds.length) setServiceIds(selectedIds);
  const estimate = estimateBooking(selectedServices, pet);

  // Bước trên URL để nút Quay lại của trình duyệt hoạt động. Chỉ tới được bước đã đi qua bằng nút Tiếp tục, và lùi về
  // bước còn làm được khi thiếu dữ liệu, nên mở thẳng `?step=3` hay tải lại trang thì về bước 1.
  const requestedStep = Math.min(parseStep(searchParams.get("step")), reachedStep);
  const canPickSlot = pet !== null && selectedServices.length > 0;
  let step: BookingStep = 1;
  if (canPickSlot && requestedStep >= 2) step = requestedStep === 3 && slotTime ? 3 : 2;

  const slots = useSpaSlots(
    { date, petId: pet?.petId ?? "", serviceIds: selectedIds },
    { enabled: canPickSlot && step >= 2 },
  );
  const createBooking = useCreateSpaAppointment();

  const durationMinutes = slots.data?.durationMinutes ?? estimate.durationMinutes;
  const staffRequired = slots.data?.staffRequired ?? estimate.staffRequired;
  const endTime = slotTime ? addMinutes(slotTime, durationMinutes) : undefined;

  // API chưa loại mốc đã trôi qua trong hôm nay nên web tự khóa. `dataUpdatedAt` giữ hàm thuần khi render và mới lại
  // theo chu kỳ tải mốc giờ; lúc khách bấm nút thì so với giờ thật (`rejectIfPast`).
  const isPast = (time: string) => isPastSlot(date, time, slots.dataUpdatedAt);
  const isOpen = ({ time, status }: SlotInfo) => status === "Available" && !isPast(time);
  const openSlots = slots.data?.slots.filter(isOpen) ?? [];

  function goToStep(next: BookingStep) {
    if (!pet) return;
    setReachedStep((reached) => (next > reached ? next : reached));
    setValidationMessage(null);
    createBooking.reset();
    router.push(ROUTES.spaBookingStep(next, pet.petId));
  }

  function clearSelection() {
    setSlotTime(null);
    setValidationMessage(null);
  }

  function selectPet(nextPetId: string) {
    setPetId(nextPetId);
    clearSelection();
  }

  function toggleService(serviceId: string) {
    setServiceIds(
      selectedIds.includes(serviceId) ? selectedIds.filter((id) => id !== serviceId) : [...selectedIds, serviceId],
    );
    clearSelection();
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    clearSelection();
    createBooking.reset();
  }

  function selectSlot(time: string) {
    setSlotTime(time);
    setValidationMessage(null);
    createBooking.reset();
  }

  function continueFromServices() {
    if (!pet) setValidationMessage(NO_PET_MESSAGE);
    else if (selectedServices.length === 0) setValidationMessage(NO_SERVICE_MESSAGE);
    else goToStep(2);
  }

  /** Mốc đang chọn vừa trôi qua: bỏ chọn, báo lý do và tải lại mốc giờ. */
  function rejectIfPast(time: string) {
    if (!isPastSlot(date, time, Date.now())) return false;
    setSlotTime(null);
    setValidationMessage(SLOT_PAST_MESSAGE);
    void slots.refetch();
    return true;
  }

  function continueFromSlots() {
    if (slotTime && rejectIfPast(slotTime)) return;
    if (openSlots.some((slot) => slot.time === slotTime)) goToStep(3);
    else setValidationMessage(NO_SLOT_MESSAGE);
  }

  function submit() {
    if (!pet || !slotTime) return;
    if (rejectIfPast(slotTime)) {
      router.replace(ROUTES.spaBookingStep(2, pet.petId));
      return;
    }
    createBooking.mutate(
      { petId: pet.petId, serviceIds: selectedIds, slotStart: toStoreDateTime(date, slotTime) },
      {
        onSuccess: ({ appointmentId }) => {
          showSuccess(`Đã gửi yêu cầu đặt lịch ${formatAppointmentCode(appointmentId)}`);
          // Thay lịch sử để nút Quay lại không về bước gửi của lịch vừa tạo.
          router.replace(ROUTES.appointmentDetail(appointmentId));
        },
        onError: (error) => {
          if (error.code === "BOOKING_LOCKED") {
            setIsLocked(true);
          } else if (error.code === "SLOT_FULL") {
            setSlotTime(null);
            router.replace(ROUTES.spaBookingStep(2, pet.petId));
          }
          // Lỗi hiện ở đầu nội dung, trên điện thoại nút gửi nằm cuối trang.
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  const slotFullError = createBooking.error?.code === "SLOT_FULL" ? createBooking.error : null;
  const submitError = createBooking.error && !slotFullError && !isLocked ? createBooking.error : null;

  const backButton = (target: BookingStep) => (
    <Button variant="ghost" onClick={() => goToStep(target)} disabled={createBooking.isPending}>
      Quay lại
    </Button>
  );

  return (
    <>
      <Stepper steps={BOOKING_STEPS} current={step} />
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {step === 1 && (
            <>
              <PetPickerCard pets={pets} petId={pet?.petId ?? null} onSelect={selectPet} />
              <ServicePickerCard
                pet={pet}
                services={pricedServices}
                isPending={services.isPending}
                error={services.error}
                onRetry={() => void services.refetch()}
                selectedIds={selectedIds}
                onToggle={toggleService}
              />
            </>
          )}

          {step === 2 && (
            <>
              {slotFullError && <ErrorAlert error={slotFullError} message={SLOT_FULL_MESSAGE} />}
              <DatePickerCard dates={dates} value={date} onChange={selectDate} />
              <SlotPickerCard
                date={date}
                slots={slots.data}
                error={slots.error}
                onRetry={() => void slots.refetch()}
                value={slotTime}
                endTime={endTime}
                isPast={isPast}
                hasOpenSlot={openSlots.length > 0}
                limitingService={earliestLatestStart(selectedServices)}
                onChange={selectSlot}
              />
            </>
          )}

          {step === 3 && pet && slotTime && (
            <>
              {isLocked && <BookingLockedAlert />}
              {submitError && <ErrorAlert error={submitError} />}
              <BookingReviewCard
                pet={pet}
                serviceNames={selectedServices.map((service) => service.name).join(", ")}
                timeRange={`${formatFullDate(date)}, ${slotTime} – ${endTime}`}
                staffRequired={staffRequired}
                total={estimate.total}
              />
              <BookingNotesCard />
            </>
          )}
        </div>

        <BookingSummary
          pet={pet}
          services={selectedServices}
          durationMinutes={durationMinutes}
          staffRequired={staffRequired}
          timeRange={step === 1 ? undefined : slotTime && `${formatDayMonth(date)}, ${slotTime} – ${endTime}`}
          total={estimate.total}
        >
          {step === 1 && (
            <Button variant="primary" size="lg" block onClick={continueFromServices}>
              Tiếp tục: chọn khung giờ
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="primary" size="lg" block onClick={continueFromSlots}>
                Tiếp tục: xác nhận
              </Button>
              {backButton(1)}
            </>
          )}
          {step === 3 && (
            <>
              <Button
                variant="primary"
                size="lg"
                block
                disabled={isLocked}
                loading={createBooking.isPending}
                onClick={submit}
              >
                Gửi yêu cầu đặt lịch
              </Button>
              {isLocked && (
                <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                  <Icon name="lock" className="mt-px size-3.5" />
                  {LOCKED_REASON}
                </p>
              )}
              {backButton(2)}
              {!isLocked && (
                <p className="text-center text-[13px] leading-5 text-muted">
                  Lịch hẹn ở trạng thái{" "}
                  <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-st-pending-bg px-2.5 text-xs font-semibold text-st-pending">
                    Chờ xác nhận
                  </span>{" "}
                  cho đến khi cửa hàng xác nhận.
                </p>
              )}
            </>
          )}
          <FieldError message={validationMessage ?? undefined} />
        </BookingSummary>
      </div>
    </>
  );
}

export function BookingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]"
    >
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/** `/dat-lich/spa` (`?petId=` chọn sẵn thú cưng, `?step=1|2|3`). */
export function SpaBookingScreen() {
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
          description="Thêm hồ sơ cho bé để đặt lịch spa."
          action={
            <ButtonLink href={ROUTES.petNewForBooking}>
              <Icon name="plus" />
              Thêm thú cưng
            </ButtonLink>
          }
        />
      </Card>
    );
  } else {
    content = <SpaBookingFlow pets={pets.data.items} />;
  }

  return (
    <>
      <PageHeader
        title="Đặt lịch spa"
        description="Bạn chọn bé, dịch vụ và giờ. Cửa hàng xếp nhân viên khi xác nhận."
      />
      {content}
    </>
  );
}
