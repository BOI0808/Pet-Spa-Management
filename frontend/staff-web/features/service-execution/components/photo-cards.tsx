"use client";

// SW-11 vùng 3 “Ảnh trước chăm sóc” và vùng 4 “Ảnh sau chăm sóc” – UI-Screens.md, FR-EXE-09, BR-20.
import { useState, type ReactNode } from "react";
import { PhotoTile } from "@/components/domain/photo-tile";
import { PhotoUpload } from "@/components/domain/photo-upload";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { getErrorMessage, type ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, PhotoKind } from "@/lib/api/types";
import { preparePhotoForUpload } from "@/lib/image-resize";
import { useAppointmentPhotos, useUploadPhoto } from "@/lib/queries/appointments";
import { getStoreToday } from "@/lib/time";
import { latestPhoto, photoMeta, validatePhotoFile } from "../service-execution";

type PhotoQuery = ReturnType<typeof useAppointmentPhotos>;

const UPLOADED_TOAST: Record<PhotoKind, string> = {
  Before: "Đã tải ảnh trước chăm sóc",
  After: "Đã tải ảnh sau chăm sóc",
};

/** 409: lịch vừa đổi trạng thái ở nơi khác nên không còn nhận loại ảnh này; hook đã tải lại chi tiết lịch. */
function uploadErrorMessage(error: ApiError) {
  if (error.status === 409) return "Lịch hẹn vừa đổi trạng thái nên chưa tải được ảnh này. Đã tải lại lịch hẹn.";
  return getErrorMessage(error);
}

/**
 * Kiểm tra tệp → thu nhỏ → gửi, kèm phần trăm cho thanh tiến trình. Lỗi tệp và lỗi 400 khi tải hiện trong ô tải
 * (UI-Screens SW-11 “Mã lỗi tại màn”).
 */
function usePhotoUploader(appointmentId: string, kind: PhotoKind) {
  const upload = useUploadPhoto();
  const { showSuccess } = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function select(file: File) {
    const invalid = validatePhotoFile(file);
    setFileError(invalid);
    upload.reset();
    if (invalid) return;

    setProgress(0);
    try {
      const prepared = await preparePhotoForUpload(file);
      await upload.mutateAsync({
        appointmentId,
        kind,
        file: prepared.blob,
        fileName: prepared.fileName,
        onProgress: setProgress,
      });
      showSuccess(UPLOADED_TOAST[kind]);
    } catch {
      // Lỗi đã nằm trong `upload.error` và hiện dưới ô tải.
    } finally {
      setProgress(null);
    }
  }

  const error = fileError ?? (upload.error ? uploadErrorMessage(upload.error) : null);
  return { select, progress, error };
}

function PhotoSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải ảnh">
      <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
    </div>
  );
}

function PhotoLoadError({ photos }: { photos: PhotoQuery }) {
  return (
    <div className="flex flex-col items-start gap-3">
      {photos.error && <ErrorAlert error={photos.error} className="w-full" />}
      <Button size="sm" onClick={() => void photos.refetch()}>
        Thử lại
      </Button>
    </div>
  );
}

type PhotoCardProps = {
  appointment: AppointmentDetail;
  petName: string;
  photos: PhotoQuery;
  /** Backend vừa trả 409 `PHOTO_REQUIRED` cho loại ảnh này: tô viền đỏ ô tải ảnh. */
  highlighted: boolean;
};

/** Khung chung: tiêu đề, thẻ trạng thái, thân thẻ (đang tải / lỗi tải danh sách ảnh / nội dung). */
function PhotoCardFrame({
  title,
  tag,
  photos,
  children,
}: {
  title: string;
  tag?: ReactNode;
  photos: PhotoQuery;
  children: ReactNode;
}) {
  let body = children;
  if (photos.isPending) body = <PhotoSkeleton />;
  else if (photos.isError) body = <PhotoLoadError photos={photos} />;
  return (
    <Card>
      <CardHeader title={title}>{!photos.isPending && !photos.isError && tag}</CardHeader>
      <CardBody>{body}</CardBody>
    </Card>
  );
}

/**
 * Vùng 3. “Hợp lệ” khi lịch đã có ảnh `Before` (G-13). Lịch đã bắt đầu mà không có ảnh trước riêng nghĩa là backend
 * đã nhận ảnh gần nhất của bé từ lịch khác (còn trong 7 ngày), nên vẫn là “Hợp lệ”.
 */
export function BeforePhotoCard({ appointment, petName, photos, highlighted }: PhotoCardProps) {
  const uploader = usePhotoUploader(appointment.appointmentId, "Before");
  const photo = latestPhoto(photos.data, "Before");
  const started = appointment.status === "InProgress" || appointment.status === "Completed";

  let tag: ReactNode = null;
  if (photo || started) tag = <Tag tone="ok">Hợp lệ</Tag>;
  else if (appointment.status === "Received") tag = <Tag tone="lock">Chưa hợp lệ</Tag>;

  let content: ReactNode;
  if (photo) {
    content = (
      <PhotoTile
        photo={photo}
        meta={`${photoMeta(photo, getStoreToday())}. Ảnh gần nhất của ${petName}`}
        onBroken={photos.refreshUrls}
      />
    );
  } else if (appointment.status === "Received") {
    // Web không biết ngày ảnh gần nhất của bé (ảnh có thể thuộc lịch khác – G-13) nên không ghi “chụp ngày …” như demo.
    content = (
      <div className="flex flex-col gap-3">
        <Alert tone="warn" icon="image">
          Lịch này chưa có ảnh trước chăm sóc của {petName}. Cần chụp ảnh mới; ảnh trước chỉ hợp lệ trong 7 ngày.
        </Alert>
        <PhotoUpload
          title="Chụp hoặc chọn ảnh trước chăm sóc"
          progress={uploader.progress}
          error={uploader.error}
          highlighted={highlighted}
          onSelect={(file) => void uploader.select(file)}
        />
      </div>
    );
  } else if (started) {
    content = <p className="text-[13px] text-muted">Dùng ảnh gần nhất của {petName} ở lịch trước (trong 7 ngày).</p>;
  } else {
    content = <p className="text-[13px] text-muted">Chưa có ảnh trước chăm sóc.</p>;
  }

  return (
    <PhotoCardFrame title="Ảnh trước chăm sóc" tag={tag} photos={photos}>
      {content}
    </PhotoCardFrame>
  );
}

/** Vùng 4. Chỉ tải được khi lịch Đang thực hiện (FR-EXE-09). */
export function AfterPhotoCard({ appointment, photos, highlighted }: PhotoCardProps) {
  const uploader = usePhotoUploader(appointment.appointmentId, "After");
  const photo = latestPhoto(photos.data, "After");

  let content: ReactNode;
  if (photo) {
    content = <PhotoTile photo={photo} meta={photoMeta(photo, getStoreToday())} onBroken={photos.refreshUrls} />;
  } else if (appointment.status === "InProgress") {
    content = (
      <PhotoUpload
        title="Chụp ảnh sau khi xong mọi dịch vụ"
        progress={uploader.progress}
        error={uploader.error}
        highlighted={highlighted}
        onSelect={(file) => void uploader.select(file)}
      />
    );
  } else if (appointment.status === "Received") {
    content = <PhotoUpload title="Chưa thể tải ảnh sau" hint="Tải được khi lịch đang thực hiện." disabled />;
  } else {
    content = <p className="text-[13px] text-muted">Chưa có ảnh sau chăm sóc.</p>;
  }

  return (
    <PhotoCardFrame title="Ảnh sau chăm sóc" tag={photo && <Tag tone="ok">Đã có</Tag>} photos={photos}>
      {content}
    </PhotoCardFrame>
  );
}
