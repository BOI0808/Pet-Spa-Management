"use client";

import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { toApiError } from "@/lib/api/errors";
import { onSessionEnded } from "./session";
import { useSession } from "./use-session";

function SessionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="animate-pulse space-y-4">
      <div className="h-8 w-64 rounded-lg bg-line-soft" />
      <div className="h-4 w-96 max-w-full rounded-lg bg-line-soft" />
      <div className="h-64 rounded-xl bg-line-soft" />
    </div>
  );
}

/**
 * Cổng của các màn sau đăng nhập (User-Flows 4.2): chỉ hiện nội dung khi phiên còn hiệu lực và đúng vai trò Quản lý.
 * Hết phiên hoặc sai vai trò thì về /dang-nhap kèm thông báo.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { me, error, retry, leave } = useSession();

  useEffect(
    () =>
      onSessionEnded((reason) =>
        leave({ reason, next: reason === "expired" ? window.location.pathname + window.location.search : undefined }),
      ),
    [leave],
  );

  if (me) return <>{children}</>;

  // Lỗi 4xx (401 hết phiên, 403 sai vai trò) đã dẫn tới việc về màn đăng nhập; chỉ mất mạng hoặc 5xx mới cho thử lại.
  if (error) {
    const { status } = toApiError(error);
    if (status === null || status >= 500) {
      return (
        <div className="space-y-3">
          <ErrorAlert error={error} />
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-10 items-center rounded-[10px] border border-lagoon px-4 font-semibold text-lagoon-700 hover:bg-lagoon-25"
          >
            Thử lại
          </button>
        </div>
      );
    }
  }

  return <SessionSkeleton />;
}
