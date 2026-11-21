"use client";

// SW-11 vùng 5 → 8: dịch vụ, cảnh báo chờ xác nhận chi phí, nút Bắt đầu / Hoàn tất – UI-Screens.md, FR-EXE-03, FR-EXE-04,
// BR-05, BR-06, BR-20, BR-23.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ServiceTask } from "@/components/domain/service-task";
import { Alert } from "@/components/feedback/alert";
import { Countdown } from "@/components/feedback/countdown";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import type { AppointmentDetail, AppointmentServiceItem, AppointmentStatus, PhotoKind } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";
import { useCompleteAppointment, useStartAppointment, useUpdateServiceProgress } from "@/lib/queries/appointments";
import { ROUTES } from "@/lib/routes";
import { toStoreTime } from "@/lib/time";
import { usePendingCostConfirmation } from "../../check-in/components/cost-confirmation";
import {
  REASONS,
  canComplete,
  reasonFromError,
  serviceProgress,
  startBlockers,
  type Reason,
} from "../service-execution";

function ReasonLine({ reason }: { reason: Reason }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs leading-4 text-muted">
      <Icon name="lock" className="mt-px size-3.5" />
      {reason}
    </p>
  );
}

/** Vùng 6: “Đang chờ khách xác nhận chi phí mới (Nhỏ → Vừa), còn mm:ss.” Đồng hồ về 0 thì tải lại lịch. */
function CostPendingAlert({ appointment }: { appointment: AppointmentDetail }) {
  const { pending, overdue } = usePendingCostConfirmation(appointment);
  if (!pending) return null;
  const change = `${SIZE_GROUP_LABELS[appointment.sizeGroup]} → ${SIZE_GROUP_LABELS[pending.newSizeGroup]}`;
  if (overdue) {
    return (
      <Alert tone="warn" icon="scale">
        Khách chưa xác nhận chi phí mới ({change}) trước {toStoreTime(pending.expiresAt)}. Chờ lễ tân ghi nhận phản hồi;
        quá hạn thì lịch bị hủy.
      </Alert>
    );
  }
  return (
    <Alert tone="warn" icon="scale">
      Đang chờ khách xác nhận chi phí mới ({change}), còn{" "}
      <b>
        <Countdown expiresAt={pending.expiresAt} plain />
      </b>
      .
    </Alert>
  );
}

type ServiceRowProps = {
  service: AppointmentServiceItem;
  status: AppointmentStatus;
  note: string;
  onNoteChange: (note: string) => void;
  onMarkDone: () => void;
  /** Đang gửi “Đánh dấu xong” của chính dịch vụ này. */
  saving: boolean;
  /** Đang gửi của một dịch vụ khác: khóa để mỗi lần chỉ gửi một dịch vụ. */
  locked: boolean;
};

/**
 * Vùng 8. Đã xong: nền xanh, “Xong lúc HH:mm”, ghi chú. Chưa xong: lịch Đang thực hiện thì có ô ghi chú (không bắt buộc)
 * và “Đánh dấu xong”; lịch chưa bắt đầu thì nút khóa. Không có bỏ đánh dấu (ui-demo không có).
 */
function ServiceRow({ service, status, note, onNoteChange, onMarkDone, saving, locked }: ServiceRowProps) {
  const name = service.name ?? "Dịch vụ";
  const inProgress = status === "InProgress";

  if (service.isDone) {
    return (
      <ServiceTask
        name={name}
        done
        detail={service.doneAt ? `Xong lúc ${toStoreTime(service.doneAt)}` : "Đã xong"}
      >
        {service.note && (
          <p className="mt-2 break-words rounded-lg bg-mist px-2.5 py-2 text-xs leading-[18px] text-ink">{service.note}</p>
        )}
      </ServiceTask>
    );
  }

  const noteId = `service-note-${service.serviceId}`;
  return (
    <ServiceTask
      name={name}
      done={false}
      detail={inProgress ? "Đang làm" : "Chưa bắt đầu"}
      aside={
        status === "Received" || inProgress ? (
          <Button
            size="sm"
            variant={inProgress ? "secondary" : "quiet"}
            disabled={!inProgress || locked}
            loading={saving}
            onClick={onMarkDone}
          >
            Đánh dấu xong
          </Button>
        ) : undefined
      }
    >
      {inProgress && (
        <Field id={noteId} label="Ghi chú" optional className="mt-2">
          {(control) => (
            <Textarea
              {...control}
              // Mỗi dịch vụ một ô “Ghi chú”: tên đọc lên kèm tên dịch vụ để trình đọc màn hình phân biệt (góp ý review
              // PR #77). Nhãn nhìn thấy giữ “Ghi chú” như ui-demo.
              aria-label={`Ghi chú cho ${name}`}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={saving}
              className="min-h-16"
            />
          )}
        </Field>
      )}
    </ServiceTask>
  );
}

type ServicesCardProps = {
  appointment: AppointmentDetail;
  petName: string;
  hasBeforePhoto: boolean;
  hasAfterPhoto: boolean;
  /**
   * Danh sách ảnh đã tải xong. Đang tải hoặc tải lỗi thì chưa biết lịch có ảnh hay chưa: khóa nút nhưng không hiện lý do
   * về ảnh (góp ý review PR #77).
   */
  photosLoaded: boolean;
  /** Backend trả 409 `PHOTO_REQUIRED`: màn tô vùng ảnh tương ứng (vùng 3 hoặc 4). */
  onPhotoRequired: (kind: PhotoKind) => void;
};

export function ServicesCard({
  appointment,
  petName,
  hasBeforePhoto,
  hasAfterPhoto,
  photosLoaded,
  onPhotoRequired,
}: ServicesCardProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const updateService = useUpdateServiceProgress(appointment.appointmentId);
  const start = useStartAppointment();
  const complete = useCompleteAppointment();
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Lý do 409 backend vừa trả, gắn với trạng thái lúc bấm: lịch đổi trạng thái thì lý do cũ tự ẩn.
  const [serverReason, setServerReason] = useState<{ status: AppointmentStatus; reason: Reason } | null>(null);

  const { appointmentId, status } = appointment;
  const services = appointment.services ?? [];
  const { done, total } = serviceProgress(appointment);
  const savingServiceId = updateService.isPending ? updateService.variables?.serviceId : undefined;

  function markDone(service: AppointmentServiceItem) {
    const note = notes[service.serviceId]?.trim();
    updateService.mutate(
      { serviceId: service.serviceId, isDone: true, ...(note ? { note } : {}) },
      {
        onSuccess: () => showSuccess(`Đã đánh dấu xong ${service.name ?? "dịch vụ"}`),
        onError: (error) => showError(error),
      },
    );
  }

  function handleActionError(action: "start" | "complete") {
    return (error: Parameters<typeof reasonFromError>[0]) => {
      const reason = reasonFromError(error, action);
      if (reason) setServerReason({ status, reason });
      if (error.code === "PHOTO_REQUIRED") onPhotoRequired(action === "start" ? "Before" : "After");
    };
  }

  function handleStart() {
    setServerReason(null);
    start.mutate(appointmentId, { onError: handleActionError("start") });
  }

  function handleComplete() {
    setServerReason(null);
    complete.mutate(appointmentId, {
      onSuccess: () => {
        showSuccess(`Đã hoàn tất ${formatAppointmentCode(appointmentId)}. Bàn giao ${petName} ra quầy.`);
        // UI-Screens: hoàn tất → SW-12 Lịch sử công việc. SW-12 làm ở thẻ 132; tới lúc đó về SW-02 Lịch hẹn.
        router.push(ROUTES.appointments);
      },
      onError: handleActionError("complete"),
    });
  }

  // Lý do khóa tính ở web, cộng lý do backend vừa trả (nếu chưa có trong danh sách).
  const shownServerReason = serverReason?.status === status ? serverReason.reason : null;
  let footer = null;
  if (status === "Received") {
    const blockers = startBlockers(appointment, hasBeforePhoto);
    const knownBlockers = photosLoaded ? blockers : blockers.filter((reason) => reason !== REASONS.beforePhoto);
    const reasons =
      shownServerReason && !knownBlockers.includes(shownServerReason) ? [...knownBlockers, shownServerReason] : knownBlockers;
    footer = (
      <>
        {start.error && !reasonFromError(start.error, "start") && <ErrorAlert error={start.error} className="mb-3" />}
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!photosLoaded || blockers.length > 0}
          loading={start.isPending}
          onClick={handleStart}
        >
          <Icon name="play" className="size-[18px]" />
          Bắt đầu thực hiện
        </Button>
        {reasons.map((reason) => (
          <ReasonLine key={reason} reason={reason} />
        ))}
      </>
    );
  } else if (status === "InProgress") {
    const ready = photosLoaded && canComplete(appointment, hasAfterPhoto);
    // Lý do gộp cả ảnh sau nên chỉ hiện khi đã biết lịch có ảnh hay chưa.
    const showReason = shownServerReason !== null || (photosLoaded && !ready);
    footer = (
      <>
        {complete.error && !reasonFromError(complete.error, "complete") && (
          <ErrorAlert error={complete.error} className="mb-3" />
        )}
        <Button variant="primary" size="lg" block disabled={!ready} loading={complete.isPending} onClick={handleComplete}>
          <Icon name="check-circle" className="size-[18px]" />
          Hoàn tất lịch hẹn
        </Button>
        {showReason && <ReasonLine reason={shownServerReason ?? REASONS.complete} />}
      </>
    );
  }

  return (
    <Card>
      <CardHeader title="Dịch vụ">
        <span className="text-[13px] text-muted tabular-nums">
          {done} / {total} xong
        </span>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {status === "Received" && <CostPendingAlert appointment={appointment} />}
        {services.length === 0 ? (
          <p className="text-muted">Chưa có thông tin dịch vụ.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {services.map((service) => (
              <ServiceRow
                key={service.serviceId}
                service={service}
                status={status}
                note={notes[service.serviceId] ?? ""}
                onNoteChange={(note) => setNotes((current) => ({ ...current, [service.serviceId]: note }))}
                onMarkDone={() => markDone(service)}
                saving={savingServiceId === service.serviceId}
                locked={savingServiceId !== undefined && savingServiceId !== service.serviceId}
              />
            ))}
          </ul>
        )}
      </CardBody>
      {/* Chân thẻ dạng cột (`.card-foot` với flex-direction: column của ui-demo): nút rộng hết thẻ, lý do khóa bên dưới.
          Không dùng CardFooter vì nó xếp hàng ngang và có khoảng cách giữa các phần tử. */}
      {footer && <div className="border-t border-line-soft px-5 py-3.5">{footer}</div>}
    </Card>
  );
}
