"use client";

import { useId, type FormEvent, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";

type ChangeDialogShellProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  /** Lỗi của lần lưu gần nhất, hiện ngay trong hộp thoại. */
  error?: unknown;
  /** Đang gửi: nút Lưu hiện spinner, hộp thoại không đóng được. */
  loading: boolean;
  /** Khóa nút Lưu khi chưa có thay đổi nào. */
  submitDisabled: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
};

/** Khung hộp thoại đổi lịch dùng chung cho MW-05·D1 (spa) và MW-05·D2 (lưu trú): tiêu đề, biểu mẫu, “Hủy bỏ” và “Lưu thay đổi”. */
export function ChangeDialogShell({
  title,
  subtitle,
  icon,
  error,
  loading,
  submitDisabled,
  onSubmit,
  onClose,
  children,
}: ChangeDialogShellProps) {
  const titleId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Overlay labelledBy={titleId} onClose={onClose} locked={loading}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-h-[calc(100vh-40px)] w-full max-w-[560px] animate-pop-in overflow-auto rounded-2xl bg-white shadow-pop"
      >
        <div className="flex items-start gap-3.5 px-5 pt-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lagoon-25 text-lagoon-700">
            <Icon name={icon} className="size-[22px]" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg leading-[26px]">
              {title}
            </h2>
            <p className="mt-0.5 text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {children}
          <ErrorAlert error={error} />
        </div>
        <div className="flex justify-end gap-2.5 px-5 pb-5 pt-1.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={submitDisabled}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
