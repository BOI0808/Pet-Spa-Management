"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "./button";

type ModalTone = "danger" | "teal" | "warn";

const ICON_TONE_CLASS: Record<ModalTone, string> = {
  danger: "bg-danger-50 text-danger",
  teal: "bg-lagoon-50 text-lagoon",
  warn: "bg-apricot-50 text-[#B87400]",
};

type ModalProps = {
  open: boolean;
  /** Gọi khi bấm Esc, bấm nền mờ hoặc nút đóng; bị bỏ qua khi `busy`. */
  onClose: () => void;
  title: string;
  description?: string;
  icon?: IconName;
  tone?: ModalTone;
  /** Đang gửi: không cho đóng để tránh mất kết quả thao tác. */
  busy?: boolean;
  children?: ReactNode;
  /** Các nút ở chân hộp thoại, căn phải. Khi mở, trình duyệt focus vào nút đầu tiên (Design-System 4.1). */
  footer: ReactNode;
};

/**
 * Hộp thoại (`.overlay`, `.modal` của ui-demo, rộng 480px) dựng trên phần tử `dialog` mở bằng `showModal()`:
 * trình duyệt giữ focus trong hộp thoại, làm trơ phần nền và trả focus về nút đã mở khi đóng.
 * Nền không cuộn khi hộp thoại mở (xem `globals.css`).
 */
export function Modal({ open, onClose, title, description, icon, tone = "teal", busy = false, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Đồng bộ trạng thái mở với phần tử dialog (API của trình duyệt, không điều khiển được bằng thuộc tính `open`).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function requestClose() {
    if (!busy) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Esc: tự xử lý để trạng thái `open` của React luôn khớp với hộp thoại.
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        // Chỉ nền mờ (::backdrop) có target là chính dialog; nội dung nằm trong thẻ div bên dưới.
        if (event.target === event.currentTarget) requestClose();
      }}
      className="m-auto max-h-[calc(100vh-40px)] w-[calc(100%-40px)] max-w-[480px] overflow-auto rounded-2xl bg-white p-0 text-ink shadow-pop backdrop:bg-ink/45 open:animate-pop"
    >
      <div>
        <div className="flex items-start gap-3.5 px-5 pt-5">
          {icon && (
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${ICON_TONE_CLASS[tone]}`}>
              <Icon name={icon} className="size-[22px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg leading-[26px]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        <div className={`flex justify-end gap-2.5 px-5 pb-5 max-[640px]:flex-wrap ${children ? "pt-0" : "pt-3.5"}`}>
          {footer}
        </div>
      </div>
    </dialog>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  /** Hệ quả của thao tác, hiện thành danh sách gạch đầu dòng. */
  consequences?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  icon?: IconName;
  /** `danger`: nút xác nhận `danger-solid` (SA 6.6 – hành động nguy hiểm). */
  tone?: "danger" | "teal";
  /** Đang gửi yêu cầu xác nhận. */
  loading?: boolean;
  /** Lỗi của lần xác nhận vừa rồi, hiện ngay trên các nút. */
  error?: unknown;
};

/** Hộp thoại xác nhận (Design-System 4.1); nút quay lại nhận focus đầu tiên để Enter không xác nhận nhầm. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel = "Quay lại",
  icon,
  tone = "danger",
  loading = false,
  error,
}: ConfirmDialogProps) {
  const hasBody = (consequences && consequences.length > 0) || Boolean(error);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      busy={loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger-solid" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {hasBody && (
        <>
          {consequences && consequences.length > 0 && (
            <ul className="list-disc pl-[18px] [&>li]:my-1">
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {Boolean(error) && <ErrorAlert error={error} className="mt-3" />}
        </>
      )}
    </Modal>
  );
}
