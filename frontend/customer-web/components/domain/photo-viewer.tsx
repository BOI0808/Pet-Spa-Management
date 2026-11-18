"use client";

// Xem lớn ảnh minh chứng (UI-Screens CW-09 vùng 5 – Đề xuất). Dựng trên `dialog` như `Modal` (Design-System 4.1):
// Esc hoặc bấm nền mờ để đóng, focus trả về ô ảnh đã mở; mũi tên trái/phải để chuyển ảnh.
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import type { Photo } from "@/lib/api/types";
import { PHOTO_KIND_LABEL, PHOTO_VIEWER_LABEL_CLASS, PhotoImage } from "./photo-tile";

type PhotoViewerProps = {
  photos: Photo[];
  /** Vị trí ảnh đang xem; `null` là đóng. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Câu mô tả thời gian của một ảnh, ví dụ “Chụp lúc 09:10, 06/10/2026”. */
  describe: (photo: Photo) => string;
  onBroken?: () => void;
};

export function PhotoViewer({ photos, index, onIndexChange, describe, onBroken }: PhotoViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const photo = index !== null ? photos[index] : undefined;
  const open = photo !== undefined;
  const count = photos.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function go(step: number) {
    if (index === null || count < 2) return;
    onIndexChange((index + step + count) % count);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Xem ảnh minh chứng"
      onCancel={(event) => {
        event.preventDefault();
        onIndexChange(null);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onIndexChange(null);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      }}
      className="m-auto max-h-[calc(100vh-40px)] w-[calc(100%-40px)] max-w-[880px] overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-pop backdrop:bg-ink/70 open:animate-pop"
    >
      {/* Cuộn ở khung trong, không ở chính dialog: bấm thanh cuộn của dialog có target là dialog nên sẽ bị coi là
          bấm nền mờ và đóng hộp thoại. */}
      {photo && (
        <div className="max-h-[calc(100vh-40px)] overflow-auto">
          <div className="flex items-center gap-3 px-5 pb-3 pt-4">
            <span
              className={`rounded-[7px] px-2 py-0.5 text-xs font-semibold ${PHOTO_VIEWER_LABEL_CLASS[photo.kind]}`}
            >
              {PHOTO_KIND_LABEL[photo.kind]}
            </span>
            <p className="min-w-0 flex-1 text-sm text-muted">{describe(photo)}</p>
            {count > 1 && (
              <span className="text-sm tabular-nums text-muted" aria-live="polite">
                {index! + 1} / {count}
              </span>
            )}
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              aria-label="Đóng"
              className="grid size-9 place-items-center rounded-[10px] text-ink hover:bg-line-soft"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="relative grid min-h-[240px] place-items-center bg-mist">
            <PhotoImage key={photo.photoId} photo={photo} onBroken={onBroken} className="block max-h-[70vh] w-auto max-w-full object-contain" />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Ảnh trước đó"
                  className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-pop hover:bg-white"
                >
                  <Icon name="chev-l" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Ảnh tiếp theo"
                  className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-pop hover:bg-white"
                >
                  <Icon name="chev-r" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
