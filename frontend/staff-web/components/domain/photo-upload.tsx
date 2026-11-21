"use client";

// PhotoUpload (`.upload-box`, `.progress` của ui-demo) – Design-System 4.2: ô viền nét đứt có biểu tượng máy ảnh, kéo-thả
// hoặc bấm “Tải ảnh lên” để chọn/chụp ảnh, thanh tiến trình khi đang tải. Chỉ lo phần giao diện; kiểm tra tệp và gọi
// API do màn dùng nó làm (SW-11).
import { useId, useRef, useState, type DragEvent } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type PhotoUploadProps = {
  title: string;
  hint?: string;
  /** Ô mờ, không có nút (ui-demo SW-11 vùng 4 trước khi bắt đầu: “Chưa thể tải ảnh sau”). */
  disabled?: boolean;
  /** Phần trăm đã gửi; `null` khi không tải. */
  progress?: number | null;
  /** Lỗi tệp hoặc lỗi 400 khi tải (UI-Screens SW-11: lỗi hiện trong ô tải). */
  error?: string | null;
  /** Viền đỏ khi backend báo thiếu ảnh (409 `PHOTO_REQUIRED`). */
  highlighted?: boolean;
  onSelect?: (file: File) => void;
};

export function PhotoUpload({
  title,
  hint = "Chỉ nhận tệp ảnh",
  disabled = false,
  progress = null,
  error = null,
  highlighted = false,
  onSelect,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;
  const canPick = !disabled && !uploading && onSelect !== undefined;

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file && canPick) onSelect(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  }

  let border = "border-[#A9C3C8]";
  if (dragging) border = "border-lagoon bg-lagoon-25";
  else if (highlighted || error) border = "border-danger";

  return (
    <div>
      <div
        className={`flex flex-col items-center gap-2 rounded-[10px] border-[1.5px] border-dashed bg-mist px-4 py-[22px] text-center text-muted ${border} ${
          disabled ? "opacity-60" : ""
        }`}
        onDragOver={(event) => {
          if (!canPick) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="grid size-11 place-items-center rounded-xl border border-line bg-white text-lagoon">
          <Icon name="camera" className="size-5" />
        </span>
        <strong className="text-ink">{title}</strong>
        <span className="text-xs">{hint}</span>
        {uploading ? (
          <div className="mt-2 w-full max-w-60">
            <div
              role="progressbar"
              aria-label="Đang tải ảnh lên"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded-full bg-line-soft"
            >
              <span className="block h-full rounded-full bg-lagoon transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs tabular-nums">Đang tải lên… {progress}%</p>
          </div>
        ) : (
          !disabled && (
            <>
              {/* Không đặt `capture` để điện thoại cho chọn giữa chụp mới và ảnh có sẵn (“Chụp hoặc chọn ảnh”). */}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  pick(event.target.files);
                  // Cho chọn lại đúng tệp vừa chọn sau khi tải lỗi.
                  event.target.value = "";
                }}
              />
              <Button
                size="sm"
                className="mt-2"
                aria-describedby={error ? errorId : undefined}
                onClick={() => inputRef.current?.click()}
              >
                Tải ảnh lên
              </Button>
            </>
          )
        )}
      </div>
      {/* Lỗi xuất hiện sau khi chọn tệp (không phải lúc gõ) nên đọc lên cho trình đọc màn hình. */}
      <div aria-live="polite">{error && <FieldError id={errorId} message={error} />}</div>
    </div>
  );
}
