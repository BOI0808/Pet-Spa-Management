"use client";

// PhotoTile (`.photo` của ui-demo) – Design-System 4.2: ảnh 4:3, nhãn Trước (trắng) / Sau (Lagoon), dải thời gian.
// Chép từ customer-web (components/domain/photo-tile.tsx), giữ cùng tên; SW-11 không mở xem lớn nên bỏ phần của PhotoViewer.
import { useEffect, useState } from "react";
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

/** Chờ URL mới tối đa 10 giây; quá hạn (vd. tải lại vẫn ra URL cũ) thì coi là không tải được. */
const RETRY_TIMEOUT_MS = 10_000;

/**
 * Thẻ `img` thường, không qua tối ưu ảnh của Next.js vì URL có hạn (Frontend-Architecture 9).
 * URL lỗi → báo `onBroken` để lấy URL mới, trong lúc chờ chỉ để trống nền ô ảnh; URL mới vẫn lỗi (hoặc không có
 * `onBroken`, hoặc chờ quá lâu) → hiện ô “Không tải được ảnh”. Ảnh tải được thì lần hết hạn sau lại được thử lại.
 */
export function PhotoImage({ photo, onBroken, className = "size-full object-cover" }: PhotoImageProps) {
  const [retryingUrl, setRetryingUrl] = useState<string | null>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const url = photo.url;
  const waiting = retryingUrl === url && brokenUrl !== url;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setBrokenUrl(url), RETRY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [waiting, url]);

  if (waiting) return <span aria-busy="true" aria-label="Đang tải ảnh" className="size-full" />;

  if (brokenUrl === url) {
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
      key={url}
      src={url}
      alt={`Ảnh ${PHOTO_KIND_LABEL[photo.kind].toLocaleLowerCase("vi-VN")} chăm sóc`}
      loading="lazy"
      decoding="async"
      className={className}
      onLoad={() => {
        if (retryingUrl !== null) setRetryingUrl(null);
      }}
      onError={() => {
        // Đang chờ URL mới cho một URL trước đó mà URL này cũng lỗi → thôi, không thử tiếp.
        if (onBroken && retryingUrl === null) {
          setRetryingUrl(url);
          onBroken();
        } else {
          setBrokenUrl(url);
        }
      }}
    />
  );
}

type PhotoTileProps = {
  photo: Photo;
  /** Dải thời gian ở đáy ảnh, ví dụ “09:10 hôm nay”. */
  meta?: string;
  onBroken?: () => void;
  className?: string;
};

export function PhotoTile({ photo, meta, onBroken, className = "" }: PhotoTileProps) {
  return (
    <div
      className={`relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] ${BACKGROUND[photo.kind]} ${className}`}
    >
      <PhotoImage photo={photo} onBroken={onBroken} />
      <span className={`absolute left-2.5 top-2.5 rounded-[7px] px-2 py-0.5 text-xs font-semibold ${LABEL_CLASS[photo.kind]}`}>
        {PHOTO_KIND_LABEL[photo.kind]}
      </span>
      {meta && (
        <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(20,50,58,.65))] px-2.5 pb-2 pt-[18px] text-left text-xs leading-4 text-white">
          {meta}
        </span>
      )}
    </div>
  );
}
