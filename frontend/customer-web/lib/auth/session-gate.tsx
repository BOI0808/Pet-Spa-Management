"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/lib/queries/me";
import { loginPath, ROUTES } from "@/lib/routes";
import { ensureAccessToken } from "./access-token";
import { sessionKeys, useSession } from "./session";
import { ALLOWED_ROLE, SESSION_MESSAGES } from "./session-config";

/** Khung xương toàn vùng nội dung khi chưa có phiên (Frontend-Architecture 4.2). */
function ContentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-3.5 w-80 max-w-full" />
      <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Lớp 2 chặn truy cập (Frontend-Architecture 4.2): lấy access token (làm mới bằng cookie nếu vừa tải trang),
 * GET /me, kiểm tra vai trò rồi mới hiện màn. Phiên kết thúc thì về màn đăng nhập.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { endReason, logout } = useSession();
  const active = endReason === null;

  const ready = useQuery({
    queryKey: sessionKeys.ready,
    queryFn: async () => (await ensureAccessToken()) !== null,
    enabled: active,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const me = useMe({ enabled: active && ready.data === true });
  const wrongRole = me.data !== undefined && me.data.role !== ALLOWED_ROLE;

  // Hết phiên: quay lại đúng trang sau khi đăng nhập (User-Flows 4.2). Tự đăng xuất: về màn đăng nhập.
  useEffect(() => {
    if (endReason === null) return;
    const { pathname, search } = window.location;
    router.replace(endReason === "expired" ? loginPath(pathname + search) : ROUTES.login);
  }, [endReason, router]);

  // Tài khoản không thuộc web khách hàng (Auth 3.6).
  useEffect(() => {
    if (wrongRole) void logout({ message: SESSION_MESSAGES.wrongRole });
  }, [wrongRole, logout]);

  // Mất mạng, 5xx, 429 khi lấy phiên: phiên có thể vẫn còn nên cho thử lại thay vì về đăng nhập.
  const loadError = ready.error ?? (me.error?.status === 401 ? null : me.error);
  if (active && loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={loadError} className="w-full" />
        <Button onClick={() => void (ready.error ? ready.refetch() : me.refetch())}>Thử lại</Button>
      </div>
    );
  }

  if (!active || ready.data !== true || !me.data || wrongRole) return <ContentSkeleton />;
  return children;
}
