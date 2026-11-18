"use client";

// CW-09 vùng 5 – Ảnh trước và sau chăm sóc (FR-EXE-09, BR-20) – UI-Screens.md
import { useState } from "react";
import { PhotoTile } from "@/components/domain/photo-tile";
import { PhotoViewer } from "@/components/domain/photo-viewer";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, AppointmentStatus, Photo } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { useAppointmentPhotos } from "@/lib/queries/appointments";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { formatDateTime } from "../appointments";

/** Ảnh chỉ có từ khi tiếp nhận (ảnh trước) trở đi; lịch chờ/đã xác nhận không cần gọi API. */
const STATUSES_WITH_PHOTOS: readonly AppointmentStatus[] = ["Received", "InProgress", "Completed", "Cancelled"];

/** Lưới `.photos` của ui-demo: ô 180 – 240px, cách 12px. */
const gridClass = "grid grid-cols-[repeat(auto-fill,minmax(180px,240px))] gap-3 max-[420px]:grid-cols-2";

/** “09:10, 06/10” – dải thời gian ở đáy ảnh. */
function photoMeta(photo: Photo) {
  return `${toStoreTime(photo.uploadedAt)}, ${formatDayMonth(toStoreDate(photo.uploadedAt))}`;
}

function EmptyPhotos() {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-5 text-center">
      <span className="grid size-16 place-items-center rounded-[20px] bg-lagoon-50 text-lagoon">
        <Icon name="camera" className="size-6" />
      </span>
      <p className="max-w-[340px] text-[13px] text-muted">
        Nhân viên spa sẽ chụp ảnh bé trước khi bắt đầu và sau khi hoàn tất. Ảnh hiện ở đây.
      </p>
    </div>
  );
}

export function PhotosCard({ appointment }: { appointment: AppointmentDetail }) {
  const canHavePhotos = STATUSES_WITH_PHOTOS.includes(appointment.status);
  const photos = useAppointmentPhotos(appointment.appointmentId, {
    enabled: canHavePhotos,
    liveStatus: appointment.status,
  });
  // Nhớ ảnh đang xem theo photoId: tải lại định kỳ có thể chen ảnh mới vào giữa danh sách (ảnh Trước xếp trước ảnh
  // Sau) nên vị trí cũ có thể trỏ sang ảnh khác; ảnh không còn trong danh sách thì hộp thoại đóng.
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Lịch đã hủy: demo ẩn thẻ, chỉ hiện khi có ảnh (hủy sau khi đã tiếp nhận) hoặc tải ảnh lỗi. Lúc đang tải không hiện
  // khung xương vì phần lớn lịch hủy trước khi tiếp nhận, không có ảnh.
  if (appointment.status === "Cancelled" && !photos.isError && !(photos.data && photos.data.length > 0)) return null;

  let body;
  if (!canHavePhotos) {
    body = <EmptyPhotos />;
  } else if (photos.isPending) {
    body = (
      <div className={gridClass} aria-busy="true" aria-label="Đang tải ảnh">
        <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
        <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
      </div>
    );
  } else if (photos.isError) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={photos.error} className="w-full" />
        <Button size="sm" onClick={() => void photos.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  } else if (photos.data.length === 0) {
    body = <EmptyPhotos />;
  } else {
    const list = photos.data;
    const viewingIndex = list.findIndex((photo) => photo.photoId === viewingId);
    body = (
      <>
        <ul className={gridClass}>
          {list.map((photo) => (
            <li key={photo.photoId}>
              <PhotoTile
                photo={photo}
                meta={photoMeta(photo)}
                onBroken={photos.refreshUrls}
                onOpen={() => setViewingId(photo.photoId)}
                className="w-full"
              />
            </li>
          ))}
        </ul>
        <PhotoViewer
          photos={list}
          index={viewingIndex === -1 ? null : viewingIndex}
          onIndexChange={(next) => setViewingId(next === null ? null : (list[next]?.photoId ?? null))}
          describe={(photo) => `Chụp lúc ${formatDateTime(photo.uploadedAt)}`}
          onBroken={photos.refreshUrls}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader title="Ảnh trước và sau chăm sóc" />
      <CardBody>{body}</CardBody>
    </Card>
  );
}
