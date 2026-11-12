"use client";

// Các thẻ của CW-09 Chi tiết lịch hẹn (vùng 4, 6, 7) – UI-Screens.md
import { PaymentBadge } from "@/components/domain/status-badge";
import { ServiceTask } from "@/components/domain/service-task";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, KeyValue } from "@/components/ui/key-value";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, Payment, Pet } from "@/lib/api/types";
import { formatDuration, formatMoney, formatWeight } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, SIZE_GROUP_LABELS } from "@/lib/labels";
import { useAppointmentPayments } from "@/lib/queries/appointments";
import { useHotelPricing } from "@/lib/queries/hotel-pricing";
import { useServices } from "@/lib/queries/services";
import { toStoreTime } from "@/lib/time";
import {
  describePet,
  findPayment,
  findPricing,
  formatDateTime,
  formatLongDate,
  formatSlotRange,
  nightsOf,
  staffNames,
} from "../appointments";

type DetailCardProps = { appointment: AppointmentDetail; pet: Pet | null };

/** Giá, thời lượng theo loài + nhóm kích cỡ của lịch; không biết loài (hồ sơ đã gỡ) thì không tra. */
function useSpaPricing(appointment: AppointmentDetail, pet: Pet | null) {
  const services = useServices(pet ? { species: pet.species, sizeGroup: appointment.sizeGroup } : {}, {
    enabled: pet !== null && appointment.type === "Spa",
  });
  return (serviceId: string) =>
    pet ? findPricing(services.data, serviceId, pet.species, appointment.sizeGroup) : undefined;
}

/** Vùng 4 (spa) – mỗi dịch vụ một dòng, tick xanh khi xong. */
export function SpaServicesCard({ appointment, pet }: DetailCardProps) {
  const pricingOf = useSpaPricing(appointment, pet);
  const isCancelled = appointment.status === "Cancelled";
  const items = appointment.services ?? [];

  return (
    <Card>
      <CardHeader title="Dịch vụ và tiến độ" />
      <CardBody>
        {items.length === 0 ? (
          <p className="text-muted">Chưa có thông tin dịch vụ.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((service) => {
              const pricing = pricingOf(service.serviceId);
              let detail: string | undefined = pricing ? formatDuration(pricing.durationMinutes) : undefined;
              if (service.isDone) {
                detail = [
                  service.doneAt ? `Xong lúc ${toStoreTime(service.doneAt)}.` : "Đã xong.",
                  service.note ? `Ghi chú: ${service.note}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
              }
              return (
                <ServiceTask
                  key={service.serviceId}
                  name={service.name ?? "Dịch vụ"}
                  done={service.isDone}
                  detail={detail}
                  aside={
                    pricing && (
                      <span className={`font-semibold tabular-nums ${isCancelled ? "text-muted" : ""}`}>
                        {formatMoney(pricing.price)}
                      </span>
                    )
                  }
                />
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Vùng 4 (lưu trú) – thời gian nhận, trả, số đêm. Mã chuồng chưa đọc được (G-05), giờ giữ chỗ phụ thuộc cấu hình (G-03). */
export function HotelStayCard({ appointment }: DetailCardProps) {
  const hotelPricing = useHotelPricing();
  const nights = nightsOf(appointment);
  const isOpen = appointment.status !== "Completed" && appointment.status !== "Cancelled";
  const items = [
    appointment.plannedCheckIn && {
      label: "Nhận",
      value: `${formatLongDate(appointment.plannedCheckIn)}, ${toStoreTime(appointment.plannedCheckIn)}`,
    },
    appointment.plannedCheckOut && {
      label: "Trả dự kiến",
      value: `${formatLongDate(appointment.plannedCheckOut)}, ${toStoreTime(appointment.plannedCheckOut)}`,
    },
    appointment.actualCheckOut && {
      label: "Trả thực tế",
      value: `${formatLongDate(appointment.actualCheckOut)}, ${toStoreTime(appointment.actualCheckOut)}`,
    },
    nights !== null && { label: "Số đêm", value: `${nights} đêm` },
    { label: "Thức ăn", value: "Cửa hàng chuẩn bị theo nhóm kích cỡ" },
  ].filter((item) => Boolean(item)) as { label: string; value: string }[];

  return (
    <Card>
      <CardHeader title="Chi tiết lưu trú" />
      <CardBody>
        <DescriptionList items={items} />
        {isOpen && hotelPricing.data && (
          // Cùng câu với bảng giá lưu trú ở CW-03; mốc miễn phí trễ phụ thuộc cấu hình (G-03).
          <Alert className="mt-4">
            Đón trễ quá 30 phút so với giờ trả đã hẹn: {formatMoney(hotelPricing.data.lateFeePerBlock)} cho mỗi 60 phút.
            Đón sớm vẫn tính đủ số đêm đã đặt.
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}

/** Vùng 6 – thú cưng, nhóm áp dụng, nhân viên, khung giờ. */
export function AppointmentInfoCard({ appointment, pet }: DetailCardProps) {
  const pending = appointment.pendingCostConfirmation;
  let sizeText = SIZE_GROUP_LABELS[appointment.sizeGroup];
  if (pending?.status === "Pending") sizeText = `${sizeText}, chờ xác nhận lên ${SIZE_GROUP_LABELS[pending.newSizeGroup]}`;
  else if (appointment.actualWeightKg != null)
    sizeText = `${sizeText} (cân thực tế ${formatWeight(appointment.actualWeightKg)})`;
  const staff = staffNames(appointment);

  return (
    <Card>
      <CardHeader title="Thông tin" />
      <CardBody className="py-3">
        <KeyValue label="Thú cưng">{pet ? describePet(pet) : (appointment.petName ?? "—")}</KeyValue>
        <KeyValue label="Nhóm áp dụng">{sizeText}</KeyValue>
        {appointment.type === "Spa" && (
          <>
            {staff.length > 0 ? (
              <KeyValue label="Nhân viên spa">{staff.join(", ")}</KeyValue>
            ) : appointment.status === "Pending" ? (
              <KeyValue label="Nhân viên spa" muted>
                Cửa hàng xếp khi xác nhận
              </KeyValue>
            ) : null}
            <KeyValue label="Khung giờ">{formatSlotRange(appointment)}</KeyValue>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function PaymentAmount({ payment }: { payment: Payment }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted">{PAYMENT_KIND_LABELS[payment.kind]}</div>
          <div className="text-[22px] font-bold leading-7 tabular-nums">{formatMoney(payment.amount)}</div>
        </div>
        <PaymentBadge status={payment.status} />
      </div>
      {payment.status === "Paid" && (
        <div className="mt-2">
          {payment.method && <KeyValue label="Phương thức">{PAYMENT_METHOD_LABELS[payment.method]}</KeyValue>}
          {payment.paidAt && <KeyValue label="Thời điểm">{formatDateTime(payment.paidAt)}</KeyValue>}
        </div>
      )}
    </>
  );
}

function EstimateAmount({ label, amount, note }: { label: string; amount: number | null; note: string }) {
  return (
    <>
      <KeyValue label={label}>
        <span className="font-semibold tabular-nums">{amount === null ? "—" : formatMoney(amount)}</span>
      </KeyValue>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </>
  );
}

/** Vùng 7 (spa): tạm tính trước khi hoàn tất, khoản spa khi đã có. Nút thanh toán trực tuyến thuộc thẻ [116]. */
function SpaPayment({ appointment, pet, payments }: DetailCardProps & { payments: Payment[] }) {
  const pricingOf = useSpaPricing(appointment, pet);
  const spaPayment = findPayment(payments, "Spa");
  if (spaPayment) {
    return (
      <>
        <PaymentAmount payment={spaPayment} />
        {spaPayment.status === "Unpaid" && (
          <p className="mt-2 text-xs text-muted">Bạn có thể thanh toán tại quầy (tiền mặt, chuyển khoản QR) khi đón bé.</p>
        )}
      </>
    );
  }
  // Chi tiết lịch chưa có số tiền tạm tính (G-05): cộng giá từng dịch vụ theo nhóm áp dụng.
  const prices = (appointment.services ?? []).map((service) => pricingOf(service.serviceId)?.price);
  const pending = appointment.pendingCostConfirmation;
  let estimate: number | null = prices.every((price) => price !== undefined)
    ? prices.reduce<number>((sum, price) => sum + (price ?? 0), 0)
    : null;
  if (pending?.status === "Pending") estimate = pending.oldAmount;
  return (
    <EstimateAmount
      label="Tạm tính"
      amount={estimate}
      note="Khoản thanh toán phát sinh khi lịch hẹn hoàn tất. Bạn có thể trả tại quầy hoặc trực tuyến."
    />
  );
}

/** Vùng 7 (lưu trú): tiền lưu trú (công thức n × (giá + thức ăn)), phí trả muộn; chỉ thanh toán tại quầy. */
function HotelPayment({ appointment, pet, payments }: DetailCardProps & { payments: Payment[] }) {
  const hotelPricing = useHotelPricing();
  const stay = findPayment(payments, "Stay");
  const lateFee = findPayment(payments, "LateFee");
  const nights = nightsOf(appointment);
  const row = pet
    ? hotelPricing.data?.pricing.find((item) => item.species === pet.species && item.sizeGroup === appointment.sizeGroup)
    : undefined;
  const formula =
    row && nights !== null
      ? `${nights} × (${formatMoney(row.pricePerNight)} + ${formatMoney(row.foodPerNight)}). `
      : "";

  const payAtCounter = "Thanh toán tại quầy khi gửi bé, trước khi bé vào chuồng.";
  // Đã trả muộn hay chưa chỉ biết chắc khi lịch kết thúc.
  const isFinished = appointment.status === "Completed" || appointment.status === "Cancelled";

  return (
    <>
      {stay ? (
        <>
          <PaymentAmount payment={stay} />
          <p className="mt-1 text-xs text-muted">
            {formula}
            {stay.status === "Unpaid" ? payAtCounter : ""}
          </p>
        </>
      ) : (
        <EstimateAmount
          label="Tạm tính"
          amount={row && nights !== null ? nights * (row.pricePerNight + row.foodPerNight) : null}
          note={`${formula}${payAtCounter}`}
        />
      )}
      <div className="mt-2 border-t border-line-soft pt-1">
        {lateFee ? (
          <PaymentAmount payment={lateFee} />
        ) : (
          <KeyValue label="Phí trả muộn" muted>
            {isFinished ? "Không phát sinh" : "Chưa phát sinh"}
          </KeyValue>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">Lịch lưu trú chỉ thanh toán tại quầy.</p>
    </>
  );
}

/** Vùng 7 – Thanh toán. Lịch đã hủy không có khoản nào thì ẩn thẻ; lỗi khi tải vẫn hiện để thử lại. */
export function PaymentCard({ appointment, pet }: DetailCardProps) {
  const payments = useAppointmentPayments(appointment.appointmentId);
  if (appointment.status === "Cancelled" && (payments.isPending || payments.data?.length === 0)) return null;

  let content;
  if (payments.isPending) {
    content = (
      <div aria-busy="true" aria-label="Đang tải">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-7 w-32" />
      </div>
    );
  } else if (payments.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={payments.error} className="w-full" />
        <Button size="sm" onClick={() => void payments.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  } else if (appointment.type === "Spa") {
    content = <SpaPayment appointment={appointment} pet={pet} payments={payments.data} />;
  } else {
    content = <HotelPayment appointment={appointment} pet={pet} payments={payments.data} />;
  }

  return (
    <Card>
      <CardHeader title="Thanh toán" />
      <CardBody>{content}</CardBody>
    </Card>
  );
}
