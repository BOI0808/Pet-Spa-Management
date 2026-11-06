"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Overlay } from "./overlay";

type DrawerProps = {
  title: string;
  /** Đang gửi: không đóng được bằng Esc, nền mờ hay nút đóng. */
  locked?: boolean;
  onClose: () => void;
  /** Form ngắn: rộng tối đa 520px thay vì 640px (Design-System 4.1, MW-08·D1). */
  narrow?: boolean;
  /** Nút ở chân ngăn kéo (nút chính nằm cuối bên phải). */
  footer: ReactNode;
  children: ReactNode;
};

/** Ngăn kéo bên phải rộng tối đa 640px (520px khi `narrow`): đầu (tiêu đề + nút đóng), thân cuộn được, chân chứa nút (`.drawer` của ui-demo). */
export function Drawer({ title, locked = false, onClose, narrow = false, footer, children }: DrawerProps) {
  const titleId = useId();

  return (
    <Overlay labelledBy={titleId} onClose={onClose} locked={locked} align="right">
      <div
        className={`flex h-full w-full animate-drawer-in flex-col bg-white shadow-pop ${narrow ? "max-w-[520px]" : "max-w-[640px]"}`}
      >
        <div className="flex items-center gap-3 border-b border-line px-6 py-[18px]">
          <h2 id={titleId} className="min-w-0 flex-1 break-words text-lg leading-[26px]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={locked}
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-ink hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2.5 border-t border-line px-6 py-3.5">{footer}</div>
      </div>
    </Overlay>
  );
}
