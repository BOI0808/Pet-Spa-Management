"use client";

// Các thẻ của SW-03 Chi tiết lịch hẹn (vùng 3 → 7) – UI-Screens.md. Phần dịch vụ, thanh toán theo CW-09 của customer-web.
import { PaymentBadge } from "@/components/domain/status-badge";
import { ServiceTask } from "@/components/domain/service-task";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, KeyValue } from "@/components/ui/key-value";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { AppointmentDetail, Payment, Pet } from "@/lib/api/types";
import { formatDuration, formatMoney, formatWeight, getInitials } from "@/lib/format";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { useAppointmentPayments } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { toStoreTime } from "@/lib/time";
import { findPayment, findPricing, formatDateTime, formatLongDate, nightsOf, staffNames } from "../appointments";

type DetailCardProps = { appointment: AppointmentDetail; pet: Pet | null };

/** Giá, thời lượng theo loài + nhóm kích cỡ của lịch; chưa có hồ sơ bé thì không tra được. */
function useSpaPricing(appointment: AppointmentDetail, pet: Pet | null) {
  const services = useServices(pet ? { species: pet.species, sizeGroup: appointment.sizeGroup } : {}, {
    enabled: pet !== null && appointment.type === "Spa",
  });
  return (serviceId: string) =>
    pet ? findPricing(services.data, serviceId, pet.species, appointment.sizeGroup) : undefined;
}

/**
 * Vùng 3 – hồ sơ thú cưng, chỉ xem (FR-PET-02: nhân viên spa chỉ xem hồ sơ của lịch được phân công). Liên kết
 * “Sửa hồ sơ” của lễ tân để thẻ 125: SW-05 cần khách đang phục vụ có số điện thoại mà lịch hẹn chưa trả (G-05).
 */
export function PetProfileCard({ pet, isSpaStaff }: { pet: Pet | null; isSpaStaff: boolean }) {
  return (
    <Card>
      <CardHeader title="Hồ sơ thú cưng">{isSpaStaff && <Tag>Chỉ xem</Tag>}</CardHeader>
      <CardBody>
        {pet ? (
          <DescriptionList
            items={[
              { label: "Loài, giống", value: `${SPECIES_LABELS[pet.species]} ${pet.breed}` },
              { label: "Cân nặng khai báo", value: formatWeight(pet.weightKg) },
              ...(pet.heightCm ? [{ label: "Chiều cao vai", value: `${pet.heightCm} cm` }] : []),
              { label: "Nhóm kích cỡ", value: SIZE_GROUP_LABELS[pet.sizeGroup] },
              { label: "Tính cách", value: TEMPERAMENT_LABELS[pet.temperament] },
              { label: "Đặc điểm lông", value: pet.coatNote || "—" },
              { label: "Ghi chú", value: pet.notes || "—" },
            ]}
          />
        ) : (
          <div aria-busy="true" aria-label="Đang tải hồ sơ" className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-4 w-full max-w-80" />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** Vùng 4 (spa) – mỗi dịch vụ một dòng: thời lượng, nhóm, giá; tick xanh khi đã xong. */
export function SpaServicesCard({ appointment, pet }: DetailCardProps) {
  const pricingOf = useSpaPricing(appointment, pet);
  const items = appointment.services ?? [];

  return (
    <Card>
      <CardHeader title="Dịch vụ" />
      <CardBody>
        {items.length === 0 ? (
          <p className="text-muted">Chưa có thông tin dịch vụ.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((service) => {
              const pricing = pricingOf(service.serviceId);
              let detail = pricing
                ? `${formatDuration(pricing.durationMinutes)}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`
                : undefined;
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
                  aside={pricing && <span className="font-semibold tabular-nums">{formatMoney(pricing.price)}</span>}
                />
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Vùng 4 (lưu trú) – nhận, trả dự kiến, số đêm. Mã chuồng (tra `GET /cages`) để thẻ 125, 127 của lễ tân. */
export function HotelStayCard({ appointment }: { appointment: AppointmentDetail }) {
  const nights = nightsOf(appointment);
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
  ].filter((item) => Boolean(item)) as { label: string; value: string }[];

  return (
    <Card>
      <CardHeader title="Chi tiết lưu trú" />
      <CardBody>
        <DescriptionList items={items} />
      </CardBody>
    </Card>
  );
}

/** Vùng 5 – khách hàng. Số điện thoại và nhãn có tài khoản/vãng lai chưa có trong lịch hẹn (G-05) nên ẩn. */
export function CustomerCard({ appointment }: { appointment: AppointmentDetail }) {
  const name = appointment.customerName ?? "Khách hàng";
  return (
    <Card>
      <CardHeader title="Khách hàng" />
      <CardBody>
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(name)} />
          <span className="min-w-0 break-words font-semibold">{name}</span>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Vùng 6 (spa) – phân công. “Nhân viên rảnh lại” chưa có `busyUntil` (G-05) nên tạm hiện giờ kết thúc `slotEnd`
 * như UI-Screens ghi; ui-demo ghi thêm thời gian dọn dẹp nhưng API chưa trả nên không cộng.
 */
export function AssignmentCard({ appointment }: { appointment: AppointmentDetail }) {
  const staff = staffNames(appointment);
  return (
    <Card>
      <CardHeader title="Phân công" />
      <CardBody className="py-3">
        <KeyValue label="Nhân viên spa" muted={staff.length === 0}>
          {staff.length > 0 ? staff.join(", ") : "Chờ quản lý xếp"}
        </KeyValue>
        {appointment.staffRequired != null && <KeyValue label="Số nhân viên cần">{appointment.staffRequired}</KeyValue>}
        {appointment.slotEnd && <KeyValue label="Nhân viên rảnh lại">{toStoreTime(appointment.slotEnd)}</KeyValue>}
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

/**
 * Vùng 7 – thanh toán, chỉ xem (như CW-09 vùng 7, không có nút thanh toán). Spa chưa hoàn tất: tạm tính cộng giá từng
 * dịch vụ (G-05) kèm “Khoản thanh toán phát sinh khi lịch hẹn hoàn tất.”; có khoản thì hiện từng khoản.
 */
export function PaymentCard({ appointment, pet }: DetailCardProps) {
  const pricingOf = useSpaPricing(appointment, pet);
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
  } else if (payments.data.length > 0) {
    content = (
      <div className="flex flex-col gap-3">
        {(["Spa", "Stay", "LateFee"] as const).map((kind) => {
          const payment = findPayment(payments.data, kind);
          return payment ? <PaymentAmount key={kind} payment={payment} /> : null;
        })}
      </div>
    );
  } else if (appointment.type === "Spa") {
    const prices = (appointment.services ?? []).map((service) => pricingOf(service.serviceId)?.price);
    const pending = appointment.pendingCostConfirmation;
    let estimate: number | null = prices.every((price) => price !== undefined)
      ? prices.reduce<number>((sum, price) => sum + (price ?? 0), 0)
      : null;
    if (pending?.status === "Pending") estimate = pending.oldAmount;
    content = (
      <>
        <KeyValue label="Tạm tính">
          <span className="font-semibold tabular-nums">{estimate === null ? "—" : formatMoney(estimate)}</span>
        </KeyValue>
        <p className="mt-1 text-xs text-muted">Khoản thanh toán phát sinh khi lịch hẹn hoàn tất.</p>
      </>
    );
  } else {
    content = <p className="text-muted">Chưa có khoản thanh toán.</p>;
  }

  return (
    <Card>
      <CardHeader title="Thanh toán" />
      <CardBody>{content}</CardBody>
    </Card>
  );
}
