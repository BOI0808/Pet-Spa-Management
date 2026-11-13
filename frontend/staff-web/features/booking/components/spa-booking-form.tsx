"use client";

// SW-06, tab Lịch spa – UI-Screens SW-06 vùng 4, 5, 7; FR-BOOK-01 → 03. Một trang, không chia bước như CW-06:
// lễ tân làm ở quầy, khách đứng chờ, nên chọn dịch vụ, ngày, giờ và tạo lịch trên cùng một màn như ui-demo.
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { DateStrip } from "@/components/domain/date-strip";
import { ServiceOption } from "@/components/domain/service-option";
import { SlotPicker } from "@/components/domain/slot-picker";
import { SumFact, SumLine, SumTotal } from "@/components/domain/summary";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError } from "@/lib/api/errors";
import type { Pet, SlotInfo } from "@/lib/api/types";
import { formatAppointmentCode, formatDayMonth, formatDuration, formatWeekdayDayMonth, formatWeekdayShort } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useCreateSpaAppointment, useSpaSlots } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { ROUTES } from "@/lib/routes";
import { addDays, addMinutes, getStoreToday, toStoreDateTime } from "@/lib/time";
import { earliestLatestStart, estimateBooking, toPricedServices, type PricedService } from "../spa-booking";
import { BOOKING_SPLIT_CLASS, BookingSummaryCard } from "./booking-summary-card";

// 7 ngày từ hôm nay như CW-06 (ui-demo SW-06 vẽ 6 ngày) để hai web giống nhau.
const DATE_COUNT = 7;

const NO_PET_MESSAGE = "Vui lòng chọn thú cưng.";
const NO_SERVICE_MESSAGE = "Vui lòng chọn ít nhất một dịch vụ.";
const NO_SLOT_MESSAGE = "Vui lòng chọn khung giờ.";
const SLOT_FULL_MESSAGE = "Mốc giờ vừa kín, vui lòng chọn mốc khác.";
const SLOT_PAST_MESSAGE = "Mốc giờ này đã qua, vui lòng chọn mốc khác.";

function isPastSlot(date: string, time: string, now: number) {
  return Date.parse(toStoreDateTime(date, time)) <= now;
}

function LoadError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorAlert error={error} className="w-full" />
      <Button onClick={onRetry}>Thử lại</Button>
    </div>
  );
}

type ServiceCardProps = {
  pet: Pet | null;
  services: PricedService[];
  isPending: boolean;
  error: ApiError | null;
  onRetry: () => void;
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
};

/** Vùng 4 – dịch vụ áp dụng cho loài của bé, lưới 2 cột, chọn một hoặc nhiều (FR-BOOK-01). */
function ServiceCard({ pet, services, isPending, error, onRetry, selectedIds, onToggle }: ServiceCardProps) {
  let content;
  if (!pet) {
    content = <p className="text-muted">Chọn thú cưng để xem dịch vụ phù hợp.</p>;
  } else if (isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải dịch vụ" className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[70px] rounded-xl" />
        ))}
      </div>
    );
  } else if (error) {
    content = <LoadError error={error} onRetry={onRetry} />;
  } else if (services.length === 0) {
    content = <p className="text-muted">Chưa có dịch vụ cho loài này.</p>;
  } else {
    content = (
      <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
        {services.map((service) => (
          <ServiceOption
            key={service.serviceId}
            name={service.name}
            durationMinutes={service.durationMinutes}
            latestStartTime={service.latestStartTime}
            price={service.price}
            checked={selectedIds.includes(service.serviceId)}
            onChange={() => onToggle(service.serviceId)}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="Dịch vụ">
        {pet && (
          <span className="text-[13px] text-muted">
            Giá nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]} của {SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")}
          </span>
        )}
      </CardHeader>
      <CardBody>{content}</CardBody>
    </Card>
  );
}

/** Câu giải thích số nhân viên (ui-demo: “Bắp khó tính nên lịch cần 2 nhân viên trong 75 phút…”). */
function staffNote(pet: Pet, staffRequired: number, durationMinutes: number) {
  const reason = pet.temperament === "Difficult" ? `${pet.name} khó tính nên lịch` : "Lịch này";
  return `${reason} cần ${staffRequired} nhân viên trong ${formatDuration(durationMinutes)}. Các mốc đã kín là lúc cửa hàng không có đủ ${staffRequired} nhân viên rảnh.`;
}

type SpaBookingFormProps = {
  customerId: string;
  pet: Pet | null;
  /** Thẻ chọn thú cưng dùng chung hai tab, màn cha giữ `petId`. */
  petCard: ReactNode;
  /** Lưu ý khách vãng lai (vùng 6), `null` khi không hiện. */
  notice: ReactNode;
};

export function SpaBookingForm({ customerId, pet, petCard, notice }: SpaBookingFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dates] = useState(() => {
    const today = getStoreToday();
    return Array.from({ length: DATE_COUNT }, (_, index) => addDays(today, index));
  });
  const [date, setDate] = useState(dates[0]);
  const [slotTime, setSlotTime] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Đổi thú cưng thì bỏ mốc giờ đã chọn (UI-Screens CW-06). Cập nhật state ngay khi render theo mẫu “lưu giá trị trước”
  // của React thay cho useEffect, để không vẽ một lần với mốc giờ cũ.
  const [shownPetId, setShownPetId] = useState(pet?.petId ?? null);
  if ((pet?.petId ?? null) !== shownPetId) {
    setShownPetId(pet?.petId ?? null);
    setSlotTime(null);
    setValidationMessage(null);
  }

  const services = useServices(pet ? { species: pet.species, sizeGroup: pet.sizeGroup } : {}, {
    enabled: pet !== null,
  });
  const pricedServices = useMemo(
    () => (pet && services.data ? toPricedServices(services.data, pet) : []),
    [pet, services.data],
  );
  const selectedServices = pricedServices.filter((service) => serviceIds.includes(service.serviceId));
  const selectedIds = selectedServices.map((service) => service.serviceId);
  // Đổi thú cưng chỉ bỏ dịch vụ không áp dụng cho bé mới; xóa hẳn khỏi state để đổi lại bé cũ không tự chọn lại.
  if (pet && services.isSuccess && selectedIds.length !== serviceIds.length) setServiceIds(selectedIds);
  const estimate = estimateBooking(selectedServices, pet);

  const canPickSlot = pet !== null && selectedServices.length > 0;
  const slots = useSpaSlots(
    { date, petId: pet?.petId ?? "", serviceIds: selectedIds },
    { enabled: canPickSlot },
  );
  const createBooking = useCreateSpaAppointment();

  // Có kết quả `GET /spa/slots` thì dùng thời lượng, số nhân viên của backend; chưa có thì dùng số tính ở web để xem.
  const slotData = canPickSlot ? slots.data : undefined;
  const durationMinutes = slotData?.durationMinutes ?? estimate.durationMinutes;
  const staffRequired = slotData?.staffRequired ?? estimate.staffRequired;
  const endTime = slotTime ? addMinutes(slotTime, durationMinutes) : undefined;

  // API chưa loại mốc đã trôi qua trong hôm nay nên web tự khóa (giống CW-06). `dataUpdatedAt` giữ hàm thuần khi render
  // và mới lại theo chu kỳ tải mốc giờ; lúc bấm tạo lịch thì so với giờ thật (`rejectIfPast`).
  const isPast = (time: string) => isPastSlot(date, time, slots.dataUpdatedAt);
  const isOpen = ({ time, status }: SlotInfo) => status === "Available" && !isPast(time);
  const openSlots = slotData?.slots.filter(isOpen) ?? [];
  const limitingService = earliestLatestStart(selectedServices);

  function clearSlot() {
    setSlotTime(null);
    setValidationMessage(null);
    createBooking.reset();
  }

  function toggleService(serviceId: string) {
    setServiceIds(
      selectedIds.includes(serviceId) ? selectedIds.filter((id) => id !== serviceId) : [...selectedIds, serviceId],
    );
    clearSlot();
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    clearSlot();
  }

  function selectSlot(time: string) {
    setSlotTime(time);
    setValidationMessage(null);
    createBooking.reset();
  }

  /** Mốc đang chọn vừa trôi qua: bỏ chọn, báo lý do và tải lại mốc giờ. */
  function rejectIfPast(time: string) {
    if (!isPastSlot(date, time, Date.now())) return false;
    setSlotTime(null);
    setValidationMessage(SLOT_PAST_MESSAGE);
    void slots.refetch();
    return true;
  }

  function submit() {
    if (!pet) return setValidationMessage(NO_PET_MESSAGE);
    if (selectedServices.length === 0) return setValidationMessage(NO_SERVICE_MESSAGE);
    if (!slotTime || !openSlots.some((slot) => slot.time === slotTime)) return setValidationMessage(NO_SLOT_MESSAGE);
    if (rejectIfPast(slotTime)) return;

    createBooking.mutate(
      { petId: pet.petId, serviceIds: selectedIds, slotStart: toStoreDateTime(date, slotTime), customerId },
      {
        onSuccess: ({ appointmentId }) => {
          showSuccess(`Đã tạo lịch spa ${formatAppointmentCode(appointmentId)}, đang chờ quản lý xác nhận`);
          // Giữ khách đang phục vụ: lễ tân có thể đặt tiếp lịch lưu trú hoặc lịch cho bé khác.
          router.push(ROUTES.appointments);
        },
        onError: (error) => {
          // 409: mốc vừa kín do người khác đặt trước; hook đã tải lại mốc giờ, ở đây bỏ mốc đã chọn.
          if (error.code === "SLOT_FULL") setSlotTime(null);
          // Lỗi hiện ở đầu nội dung; trên điện thoại nút tạo lịch nằm cuối trang.
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  const slotFullError = createBooking.error?.code === "SLOT_FULL" ? createBooking.error : null;
  const submitError = createBooking.error && !slotFullError ? createBooking.error : null;

  let slotContent;
  if (!canPickSlot) {
    slotContent = <p className="text-muted">Chọn thú cưng và ít nhất một dịch vụ để xem khung giờ.</p>;
  } else if (slots.isError) {
    slotContent = <LoadError error={slots.error} onRetry={() => void slots.refetch()} />;
  } else if (!slotData) {
    slotContent = (
      <div aria-busy="true" aria-label="Đang tải khung giờ" className="grid grid-cols-5 gap-2 max-[640px]:grid-cols-3">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  } else {
    slotContent = (
      <>
        {openSlots.length === 0 && (
          <Alert tone="warn" className="mb-4">
            Ngày này đã kín, vui lòng chọn ngày khác.
          </Alert>
        )}
        <SlotPicker
          name="booking-slot"
          label={`Chọn khung giờ, ${formatWeekdayDayMonth(date)}`}
          slots={slotData.slots}
          value={slotTime}
          endTime={endTime}
          isPast={isPast}
          onChange={selectSlot}
        />
        {pet && (
          <Alert className="mt-4">
            {staffNote(pet, slotData.staffRequired, slotData.durationMinutes)}
            {limitingService && ` ${limitingService.name} nhận muộn nhất lúc ${limitingService.latestStartTime}.`}
          </Alert>
        )}
      </>
    );
  }

  const staffText = pet?.temperament === "Difficult" && staffRequired >= 2 ? `${staffRequired} (bé khó tính)` : staffRequired;
  const timeText = slotTime ? `${formatWeekdayShort(date)} ${formatDayMonth(date)}, ${slotTime} – ${endTime}` : "Chưa chọn";

  return (
    <div className={BOOKING_SPLIT_CLASS}>
      <div className="flex min-w-0 flex-col gap-4">
        {submitError && <ErrorAlert error={submitError} />}
        {petCard}
        <ServiceCard
          pet={pet}
          services={pricedServices}
          isPending={services.isPending}
          error={services.error}
          onRetry={() => void services.refetch()}
          selectedIds={selectedIds}
          onToggle={toggleService}
        />
        {slotFullError && <ErrorAlert error={slotFullError} message={SLOT_FULL_MESSAGE} />}
        <Card>
          <CardHeader title="Ngày và khung giờ" />
          <CardBody>
            <DateStrip name="booking-date" label="Chọn ngày" dates={dates} value={date} onChange={selectDate} />
            <div className="mt-4">{slotContent}</div>
          </CardBody>
        </Card>
        {notice}
      </div>

      <BookingSummaryCard
        pet={pet}
        footer={
          <>
            <Button variant="primary" size="lg" block loading={createBooking.isPending} onClick={submit}>
              Tạo lịch hẹn spa
            </Button>
            <FieldError message={validationMessage ?? undefined} />
          </>
        }
      >
        {selectedServices.length > 0 ? (
          selectedServices.map((service) => (
            <SumLine
              key={service.serviceId}
              label={service.name}
              note={`${service.durationMinutes} phút`}
              amount={service.price}
            />
          ))
        ) : (
          <p className="py-2 text-muted">Chưa chọn dịch vụ.</p>
        )}
        <div className="mt-2 rounded-xl bg-mist px-3 py-2.5 text-[13px]">
          <SumFact label="Thời gian">{timeText}</SumFact>
          <SumFact label="Số nhân viên cần">{staffText}</SumFact>
        </div>
        <SumTotal label="Tạm tính" amount={estimate.total} note="Chưa gồm thay đổi khi cân thực tế" />
      </BookingSummaryCard>
    </div>
  );
}
