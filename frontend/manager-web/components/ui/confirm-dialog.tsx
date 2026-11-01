"use client";

import { useId, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "./button";
import { Overlay } from "./overlay";

type ConfirmDialogProps = {
  title: string;
  /** Dòng phụ dưới tiêu đề. */
  subtitle?: string;
  icon: IconName;
  confirmLabel: string;
  /** Đang gửi lệnh: nút xác nhận hiện spinner, không đóng được. */
  loading?: boolean;
  /** Lỗi của lần xác nhận gần nhất, hiện ngay trong hộp thoại (UI-Screens 2.2). */
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
  /** Hậu quả của hành động. */
  children: ReactNode;
};

/** Hộp thoại xác nhận hành động nguy hiểm (SA 6.6): nút xác nhận nêu đúng hậu quả, nút còn lại là “Quay lại”. */
export function ConfirmDialog({
  title,
  subtitle,
  icon,
  confirmLabel,
  loading = false,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Overlay labelledBy={titleId} onClose={onClose} locked={loading}>
      <div className="max-h-[calc(100vh-40px)] w-full max-w-[480px] animate-pop-in overflow-auto rounded-2xl bg-white shadow-pop">
        <div className="flex items-start gap-3.5 px-5 pt-5">
          {/* Ô biểu tượng tông cảnh báo: `.mh-icon.warn` của ui-demo. */}
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-apricot-50 text-[#B87400]">
            <Icon name={icon} className="size-[22px]" />
          </span>
          <div>
            <h2 id={titleId} className="text-lg leading-[26px]">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <div>{children}</div>
          <ErrorAlert error={error} />
        </div>
        <div className="flex justify-end gap-2.5 px-5 pb-5 pt-3.5">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Quay lại
          </Button>
          <Button variant="danger-solid" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
