"use client";

// CW-10 lịch spa: vùng 3 (thú cưng, dịch vụ), 4 (ngày, khung giờ mới), 5 (sau khi đổi) – UI-Screens.md, FR-CHG-01.
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DateStrip } from "@/components/domain/date-strip";
import { ServiceOption } from "@/components/domain/service-option";
import { SlotPicker } from "@/components/domain/slot-picker";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, Pet, SlotInfo } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { useUpdateAppointment } from "@/lib/queries/appointment-changes";
import { useSpaSlots } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { ROUTES } from "@/lib/routes";
import { addMinutes, getStoreToday, toStoreDate, toStoreDateTime, toStoreTime } from "@/lib/time";
import {
  NO_PET_MESSAGE,
  NO_SERVICE_MESSAGE,
  NO_SLOT_MESSAGE,
  SLOT_FULL_MESSAGE,
  SLOT_PAST_MESSAGE,
  bookingDates,
  earliestLatestStart,
  estimateBooking,
  isPastSlot,
  toPricedServices,
} from "@/features/booking/spa-booking";
import { joinNames } from "../appointments";
import { formatNewSlot, sameIds, sameInstant } from "../change-appointment";
import { ChangeSummary, CurrentAppointmentBox, PetSelect } from "./change-summary";

const SUCCESS_MESSAGE = "Đã gửi yêu cầu đổi lịch. Lịch đang chờ cửa hàng duyệt lại.";

/** Dải 7 ngày từ hôm nay như CW-06; ngày hẹn hiện tại nằm sau khoảng đó thì chèn thêm riêng ngày ấy ở cuối. */
function changeDates(originalDate: string) {
  const today = getStoreToday();
  const dates = bookingDates(today);
  return originalDate > dates[dates.length - 1] ? [...dates, originalDate] : dates;
}

type SpaChangeFormProps = {
  appointment: AppointmentDetail;
  pets: Pet[];
  /** Hồ sơ của thú cưng đang gắn với lịch (`GET /pets/{id}`), có thể đã gỡ nên không nằm trong `pets`. */
  currentPet: Pet | null;
  onWindowClosed: (error: unknown) => void;
};

export function SpaChangeForm({ appointment, pets, currentPet, onWindowClosed }: SpaChangeFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();

  const originalStart = appointment.slotStart ?? "";
  const originalDate = toStoreDate(originalStart);
  const originalTime = toStoreTime(originalStart);
  const originalServiceIds = useMemo(
    () => (appointment.services ?? []).map((service) => service.serviceId),
    [appointment.services],
  );

  // Chọn sẵn đúng lịch hiện tại. Hồ sơ đã gỡ không chọn lại được (backend chỉ nhận thú cưng đang hoạt động).
  const [petId, setPetId] = useState<string | null>(() =>
    pets.some((pet) => pet.petId === appointment.petId) ? appointment.petId : null,
  );
  const [serviceIds, setServiceIds] = useState<string[]>(originalServiceIds);
  // Khách đã đổi sang bé khác ít nhất một lần.
  const [petTouched, setPetTouched] = useState(false);
  // Mốc vừa bị backend trả 409 `SLOT_FULL` (“YYYY-MM-DD HH:mm”): không mở lại mốc này.
  const [slotFullAt, setSlotFullAt] = useState<string | null>(null);
  const [dates] = useState(() => changeDates(originalDate));
  const [date, setDate] = useState(() => (dates.includes(originalDate) ? originalDate : dates[0]));
  const [slotTime, setSlotTime] = useState<string | null>(() => (dates.includes(originalDate) ? originalTime : null));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const pet = pets.find((item) => item.petId === petId) ?? null;
  const services = useServices(pet ? { species: pet.species, sizeGroup: pet.sizeGroup } : {}, { enabled: pet !== null });
  const pricedServices = useMemo(
    () => (pet && services.data ? toPricedServices(services.data, pet) : []),
    [pet, services.data],
  );
  const selectedServices = pricedServices.filter((service) => serviceIds.includes(service.serviceId));
  const selectedIds = selectedServices.map((service) => service.serviceId);
  // Đổi sang bé khác thì bỏ dịch vụ không áp dụng cho bé mới (như CW-06): chờ danh sách của bé mới rồi mới lọc. Chỉ lọc
  // sau khi khách đổi bé; lúc vừa mở form thì giữ nguyên để báo dịch vụ hiện tại không còn áp dụng (bên dưới).
  if (petTouched && pet && services.isSuccess && selectedIds.length !== serviceIds.length) setServiceIds(selectedIds);
  // Dịch vụ của lịch hiện tại không còn trong `GET /services` của bé (đã ngừng, hoặc bé đổi nhóm kích cỡ sau khi cân):
  // không gửi được nên báo rõ tên, thay vì bỏ chọn âm thầm.
  const unavailableServices =
    !petTouched && pet && services.isSuccess
      ? (appointment.services ?? []).filter(
          (item) => serviceIds.includes(item.serviceId) && !pricedServices.some((s) => s.serviceId === item.serviceId),
        )
      : [];
  const estimate = estimateBooking(selectedServices, pet);

  const canPickSlot = pet !== null && selectedServices.length > 0;
  const slots = useSpaSlots({ date, petId: pet?.petId ?? "", serviceIds: selectedIds }, { enabled: canPickSlot });
  const update = useUpdateAppointment(appointment.appointmentId, appointment.slotStart);

  // `GET /spa/slots` vẫn tính chỗ lịch này đang giữ nên mốc hiện tại có thể hiện “Đã kín”. Backend bỏ lượt giữ chỗ
  // của chính lịch khi đổi, nên mở lại mốc hiện tại, nhưng chỉ khi thú cưng và dịch vụ vẫn như lịch hiện tại (cùng
  // thời lượng, số nhân viên) và mốc chưa bị backend trả `SLOT_FULL`. Đổi thú cưng/dịch vụ thì theo đúng kết quả API.
  const keepsCurrentPlan = petId === appointment.petId && sameIds(selectedIds, originalServiceIds);
  const reopenCurrent = keepsCurrentPlan && slotFullAt !== `${originalDate} ${originalTime}`;
  const slotList = useMemo<SlotInfo[] | undefined>(
    () =>
      slots.data?.slots.map((slot) =>
        reopenCurrent && date === originalDate && slot.time === originalTime && slot.status === "Full"
          ? { ...slot, status: "Available" }
          : slot,
      ),
    [slots.data, reopenCurrent, date, originalDate, originalTime],
  );

  const durationMinutes = slots.data?.durationMinutes ?? estimate.durationMinutes;
  const endTime = slotTime ? addMinutes(slotTime, durationMinutes) : undefined;
  const isPast = (time: string) => isPastSlot(date, time, slots.dataUpdatedAt);
  const openSlots = slotList?.filter((slot) => slot.status === "Available" && !isPast(slot.time)) ?? [];
  const slotIsOpen = slotTime !== null && openSlots.some((slot) => slot.time === slotTime);

  const newSlotStart = slotTime ? toStoreDateTime(date, slotTime) : null;
  const hasChanges =
    petId !== appointment.petId || !sameIds(selectedIds, originalServiceIds) || !sameInstant(newSlotStart, originalStart);

  function clearFeedback() {
    setValidationMessage(null);
    update.reset();
  }

  function selectPet(nextPetId: string) {
    setPetId(nextPetId);
    setPetTouched(true);
    clearFeedback();
  }

  function toggleService(serviceId: string) {
    setServiceIds(
      selectedIds.includes(serviceId) ? selectedIds.filter((id) => id !== serviceId) : [...selectedIds, serviceId],
    );
    clearFeedback();
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    setSlotTime(null);
    clearFeedback();
  }

  function selectSlot(time: string) {
    setSlotTime(time);
    clearFeedback();
  }

  function submit() {
    if (!pet) return setValidationMessage(NO_PET_MESSAGE);
    if (selectedServices.length === 0) return setValidationMessage(NO_SERVICE_MESSAGE);
    if (slotTime && isPastSlot(date, slotTime, Date.now())) {
      setSlotTime(null);
      void slots.refetch();
      return setValidationMessage(SLOT_PAST_MESSAGE);
    }
    if (!slotTime || !slotIsOpen) return setValidationMessage(NO_SLOT_MESSAGE);

    update.mutate(
      { petId: pet.petId, serviceIds: selectedIds, slotStart: toStoreDateTime(date, slotTime) },
      {
        onSuccess: () => {
          showSuccess(SUCCESS_MESSAGE);
          // Thay lịch sử để nút Quay lại không về form đổi lịch đã gửi.
          router.replace(ROUTES.appointmentDetail(appointment.appointmentId));
        },
        onError: (error) => {
          if (error.code === "CHANGE_WINDOW_CLOSED") return onWindowClosed(error);
          if (error.code === "SLOT_FULL") {
            setSlotFullAt(`${date} ${slotTime}`);
            setSlotTime(null);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    );
  }

  const submitError = update.error && update.error.code !== "CHANGE_WINDOW_CLOSED" ? update.error : null;

  let slotContent;
  if (!canPickSlot) {
    slotContent = <p className="text-muted">Chọn thú cưng và ít nhất một dịch vụ để xem khung giờ.</p>;
  } else if (slots.error) {
    slotContent = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={slots.error} className="w-full" />
        <Button onClick={() => void slots.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (!slotList) {
    slotContent = (
      <div aria-busy="true" aria-label="Đang tải khung giờ" className="grid grid-cols-5 gap-2 max-[640px]:grid-cols-3">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  } else {
    const limiting = earliestLatestStart(selectedServices);
    slotContent = (
      <>
        {openSlots.length === 0 && (
          <Alert tone="warn" className="mb-4">
            Ngày này đã kín, vui lòng chọn ngày khác.
          </Alert>
        )}
        <SlotPicker
          name="change-slot"
          label="Chọn khung giờ mới"
          slots={slotList}
          value={slotTime}
          endTime={endTime}
          isPast={isPast}
          onChange={selectSlot}
        />
        <p className="mt-3 text-[13px] leading-[18px] text-muted">
          Lịch này cần {slots.data?.staffRequired ?? estimate.staffRequired} nhân viên trong{" "}
          {formatDuration(durationMinutes)}.{limiting && ` ${limiting.name} nhận muộn nhất lúc ${limiting.latestStartTime}.`}
        </p>
      </>
    );
  }

  let serviceContent;
  if (!pet) {
    serviceContent = <p className="text-muted">Chọn thú cưng để xem dịch vụ phù hợp.</p>;
  } else if (services.isPending) {
    serviceContent = (
      <div aria-busy="true" aria-label="Đang tải dịch vụ" className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[70px] rounded-xl" />
        ))}
      </div>
    );
  } else if (services.error) {
    serviceContent = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={services.error} className="w-full" />
        <Button onClick={() => void services.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (pricedServices.length === 0) {
    serviceContent = <p className="text-muted">Chưa có dịch vụ cho loài này.</p>;
  } else {
    serviceContent = (
      <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
        {pricedServices.map((service) => (
          <ServiceOption
            key={service.serviceId}
            name={service.name}
            durationMinutes={service.durationMinutes}
            latestStartTime={service.latestStartTime}
            price={service.price}
            checked={selectedIds.includes(service.serviceId)}
            onChange={() => toggleService(service.serviceId)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {submitError && (
          <ErrorAlert error={submitError} message={submitError.code === "SLOT_FULL" ? SLOT_FULL_MESSAGE : undefined} />
        )}
        <CurrentAppointmentBox
          appointment={appointment}
          petName={appointment.petName ?? currentPet?.name ?? "Thú cưng"}
          species={currentPet?.species ?? null}
        />
        <Card>
          <CardHeader title="Thú cưng và dịch vụ" />
          <CardBody className="flex flex-col gap-4">
            <PetSelect pets={pets} value={petId} onChange={selectPet} />
            {unavailableServices.length > 0 && (
              <Alert tone="warn" title="Có dịch vụ không còn áp dụng">
                {joinNames(unavailableServices.map((item) => item.name ?? "Dịch vụ không rõ tên"))} của lịch hiện tại
                không còn áp dụng cho {pet?.name ?? "bé"} (dịch vụ đã ngừng hoặc bé đã đổi nhóm kích cỡ), nên không có
                trong lịch sau khi đổi. Bạn có thể chọn dịch vụ khác bên dưới.
              </Alert>
            )}
            {serviceContent}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Ngày và khung giờ mới" />
          <CardBody className="flex flex-col gap-4">
            <DateStrip name="change-date" label="Chọn ngày" dates={dates} value={date} onChange={selectDate} />
            <div>{slotContent}</div>
          </CardBody>
        </Card>
      </div>

      <ChangeSummary
        isHotel={false}
        totalLabel="Tạm tính"
        amount={estimate.total}
        hasChanges={hasChanges}
        loading={update.isPending}
        onSubmit={submit}
        appointmentId={appointment.appointmentId}
        validationMessage={validationMessage}
      >
        <KeyValue label="Thú cưng">{pet?.name ?? "Chưa chọn"}</KeyValue>
        <KeyValue label="Thời gian">
          {slotTime && slotIsOpen ? formatNewSlot(date, slotTime, endTime) : "Chưa chọn"}
        </KeyValue>
        <KeyValue label="Dịch vụ">
          {selectedServices.length > 0
            ? `${selectedServices.length} dịch vụ, ${durationMinutes} phút`
            : "Chưa chọn"}
        </KeyValue>
      </ChangeSummary>
    </div>
  );
}
