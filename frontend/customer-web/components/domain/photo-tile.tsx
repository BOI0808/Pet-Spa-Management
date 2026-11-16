"use client";

// PhotoTile (`.photo` của ui-demo) – Design-System 4.2: ảnh 4:3, nhãn Trước (trắng) / Sau (Lagoon), dải thời gian.
import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Photo, PhotoKind } from "@/lib/api/types";

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = { Before: "Trước", After: "Sau" };

const BACKGROUND: Record<PhotoKind, string> = {
  Before: "bg-[linear-gradient(160deg,#E6EAE6,#D3DAD5)]",
  After: "bg-[linear-gradient(160deg,#E9F7F7,#CBEDEF)]",
};

const LABEL_CLASS: Record<PhotoKind, string> = {
  Before: "bg-white text-ink",
  After: "bg-lagoon text-white",
};

type PhotoImageProps = {
  photo: Photo;
  /** Ảnh không tải được (thường do URL tạm thời hết hạn): gọi một lần để lấy URL mới. */
  onBroken?: () => void;
  className?: string;
};

/**
 * Thẻ `img` thường, không qua tối ưu ảnh của Next.js vì URL có hạn (Frontend-Architecture 9).
 * Lỗi lần đầu với một URL → báo `onBroken` để lấy URL mới; URL mới vẫn lỗi → hiện ô “Không tải được ảnh”.
 */
export function PhotoImage({ photo, onBroken, className = "size-full object-cover" }: PhotoImageProps) {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);

  if (brokenUrl === photo.url && retried) {
    return (
      <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted">
        <Icon name="image" className="size-6" />
        Không tải được ảnh
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL tạm thời, không qua next/image
    <img
      key={photo.url}
      src={photo.url}
      alt={`Ảnh ${PHOTO_KIND_LABEL[photo.kind].toLocaleLowerCase("vi-VN")} chăm sóc`}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setBrokenUrl(photo.url);
        if (!retried) {
          setRetried(true);
          onBroken?.();
        }
      }}
    />
  );
}

type PhotoTileProps = {
  photo: Photo;
  /** Dải thời gian ở đáy ảnh, ví dụ “09:10, 06/10”; bỏ trống ở ảnh nhỏ (CW-11). */
  meta?: string;
  onBroken?: () => void;
  /** Có thì cả ô là nút mở xem lớn. */
  onOpen?: () => void;
  className?: string;
};

export function PhotoTile({ photo, meta, onBroken, onOpen, className = "" }: PhotoTileProps) {
  const label = PHOTO_KIND_LABEL[photo.kind];
  const content = (
    <>
      <PhotoImage photo={photo} onBroken={onBroken} />
      <span className={`absolute left-2.5 top-2.5 rounded-[7px] px-2 py-0.5 text-xs font-semibold ${LABEL_CLASS[photo.kind]}`}>
        {label}
      </span>
      {meta && (
        <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(20,50,58,.65))] px-2.5 pb-2 pt-[18px] text-left text-xs leading-4 text-white">
          {meta}
        </span>
      )}
    </>
  );
  const boxClass = `relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] ${BACKGROUND[photo.kind]} ${className}`;

  if (!onOpen) return <div className={boxClass}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Xem lớn ảnh ${label.toLocaleLowerCase("vi-VN")} chăm sóc${meta ? `, ${meta}` : ""}`}
      className={`${boxClass} cursor-zoom-in outline-offset-2 transition-opacity hover:opacity-90`}
    >
      {content}
    </button>
  );
}
