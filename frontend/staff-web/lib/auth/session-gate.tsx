"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { toApiError } from "@/lib/api/errors";
import { canAccessPath } from "@/lib/route-access";
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
 * Cổng của các màn sau đăng nhập: chỉ hiện nội dung khi phiên còn hiệu lực và là tài khoản nhân viên.
 * Hết phiên hoặc sai vai trò thì về /dang-nhap kèm thông báo.
 * Nhân viên vào màn của vai trò kia (gõ thẳng đường dẫn) thì hiện "Bạn không có quyền" như khi backend trả 403 (Authorization mục 9).
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { me, error, retry, leave } = useSession();
  const pathname = usePathname();

  useEffect(
    () =>
      onSessionEnded((reason) =>
        leave({ reason, next: reason === "expired" ? window.location.pathname + window.location.search : undefined }),
      ),
    [leave],
  );

  if (me) {
    // `staffRole` luôn có: loadMe đã loại tài khoản thiếu nó (isStaffAccount).
    return me.staffRole && canAccessPath(pathname, me.staffRole) ? <>{children}</> : <ForbiddenState />;
  }

  // 401 (hết phiên) và 403 (sai vai trò) đã kích hoạt việc về màn đăng nhập nên chỉ cần chờ chuyển trang: giữ khung xương.
  // Mọi lỗi còn lại (mất mạng, 400, 429, 5xx…) không tự dẫn đi đâu, phải hiện lỗi và cho thử lại.
  if (error) {
    const { status } = toApiError(error);
    if (status !== 401 && status !== 403) {
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
