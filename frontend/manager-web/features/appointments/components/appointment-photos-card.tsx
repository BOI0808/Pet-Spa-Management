"use client";

// MW-05 vùng 4 – Ảnh minh chứng (FR-EXE-09, BR-20) – UI-Screens.md. Quản lý chỉ xem; ảnh do nhân viên spa tải lên.
import { useState } from "react";
import { PhotoTile } from "@/components/domain/photo-tile";
import { PhotoViewer } from "@/components/domain/photo-viewer";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { AppointmentDetail, AppointmentStatus, Photo } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { useAppointmentPhotos } from "@/lib/queries/appointments";
import { toStoreDate, toStoreTime } from "@/lib/time";
import { formatStoreDate } from "../schedule";

/** Ảnh chỉ có từ khi tiếp nhận (ảnh trước) trở đi; lịch chờ/đã xác nhận không cần gọi API. */
const STATUSES_WITH_PHOTOS: readonly AppointmentStatus[] = ["Received", "InProgress", "Completed", "Cancelled"];

/** Lưới `.photos` của ui-demo: ô 180 – 240px, cách 12px. */
const gridClass = "grid grid-cols-[repeat(auto-fill,minmax(180px,240px))] gap-3 max-[420px]:grid-cols-2";

/** “09:10, 06/10” – dải thời gian ở đáy ảnh. */
function photoMeta(photo: Photo) {
  return `${toStoreTime(photo.uploadedAt)}, ${formatDayMonth(toStoreDate(photo.uploadedAt))}`;
}

function EmptyPhotos({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-5 text-center">
      <span className="grid size-16 place-items-center rounded-[20px] bg-lagoon-50 text-lagoon">
        <Icon name="camera" className="size-6" />
      </span>
      <p className="max-w-[340px] text-[13px] text-muted">{message}</p>
    </div>
  );
}

export function AppointmentPhotosCard({ appointment }: { appointment: AppointmentDetail }) {
  const canHavePhotos = STATUSES_WITH_PHOTOS.includes(appointment.status);
  const photos = useAppointmentPhotos(appointment.appointmentId, { enabled: canHavePhotos, liveStatus: appointment.status });
  // Nhớ ảnh đang xem theo photoId: tải lại định kỳ có thể chen ảnh mới vào giữa danh sách (ảnh Trước xếp trước ảnh
  // Sau) nên vị trí cũ có thể trỏ sang ảnh khác; ảnh không còn trong danh sách thì hộp thoại đóng.
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Lịch đã hủy: chỉ hiện thẻ khi có ảnh (hủy sau khi đã tiếp nhận) hoặc tải ảnh lỗi. Lúc đang tải không hiện khung xương
  // vì phần lớn lịch hủy trước khi tiếp nhận, không có ảnh.
  if (appointment.status === "Cancelled" && !photos.isError && !(photos.data && photos.data.length > 0)) return null;

  let body;
  if (!canHavePhotos) {
    body = <EmptyPhotos message="Chưa có ảnh. Nhân viên spa chụp ảnh trước khi bắt đầu và sau khi hoàn tất." />;
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
    body = <EmptyPhotos message="Chưa có ảnh. Nhân viên spa chụp ảnh trước khi bắt đầu và sau khi hoàn tất." />;
  } else {
    const list = photos.data;
    const viewingIndex = list.findIndex((photo) => photo.photoId === viewingId);
    const hasAfter = list.some((photo) => photo.kind === "After");
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
          {!hasAfter && appointment.status !== "Cancelled" && (
            // Ô nét đứt “Chưa có ảnh sau” của wireframe MW-05 vùng 4.
            <li className="grid aspect-[4/3] place-items-center rounded-[10px] border border-dashed border-line bg-mist p-3 text-center">
              <div>
                <div className="font-semibold">Chưa có ảnh sau</div>
                <div className="text-xs text-muted">Nhân viên spa tải lên khi chăm sóc xong</div>
              </div>
            </li>
          )}
        </ul>
        <PhotoViewer
          photos={list}
          index={viewingIndex === -1 ? null : viewingIndex}
          onIndexChange={(next) => setViewingId(next === null ? null : (list[next]?.photoId ?? null))}
          describe={(photo) => `Chụp lúc ${toStoreTime(photo.uploadedAt)}, ${formatStoreDate(toStoreDate(photo.uploadedAt))}`}
          onBroken={photos.refreshUrls}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader title="Ảnh minh chứng">
        <Tag>Chỉ xem</Tag>
      </CardHeader>
      <div className="p-5">{body}</div>
    </Card>
  );
}
