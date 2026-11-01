"use client";

import { useEffect, useRef, type ReactNode } from "react";

type OverlayProps = {
  /** Id của tiêu đề (h2) trong nội dung, để trình đọc màn hình đọc tên hộp thoại. */
  labelledBy: string;
  onClose: () => void;
  /** Đang gửi: Esc và bấm nền mờ không đóng được (Design-System 4.1). */
  locked?: boolean;
  /** `center`: hộp thoại giữa màn; `right`: ngăn kéo sát mép phải. */
  align?: "center" | "right";
  children: ReactNode;
};

/**
 * Nền mờ + khung chứa dùng chung cho `ConfirmDialog` và `Drawer`, dựng trên phần tử `dialog` có sẵn của trình duyệt:
 * Esc và giữ focus trong hộp thoại do trình duyệt lo; trả focus về nút đã mở khi đóng thì Overlay làm (Design-System 4.1, 7).
 * Chỉ render khi đang mở (`{open && <Overlay … />}`).
 */
export function Overlay({ labelledBy, onClose, locked = false, align = "center", children }: OverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Đồng bộ với thứ ngoài React: mở bằng showModal(), khóa cuộn nền; khi đóng thì dọn và trả focus về nút đã mở.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      // Esc: để React quyết định đóng hay không (đang gửi thì giữ lại).
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      // Nền mờ `rgba(20,50,58,0.45)` theo `.overlay` của ui-demo. `dialog` phủ kín màn hình nên bấm ra ngoài khung nội dung chính là bấm vào chính nó.
      onClick={(event) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
      className={`fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent text-ink backdrop:bg-[rgba(20,50,58,0.45)] ${
        align === "right" ? "justify-end p-0" : "items-center justify-center p-5"
      } open:flex`}
    >
      {children}
    </dialog>
  );
}
